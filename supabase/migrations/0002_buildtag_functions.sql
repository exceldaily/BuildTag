-- =============================================================================
-- BuildTag - triggers and API functions
-- =============================================================================
-- Public (anonymous) traffic never touches tables directly. Everything a
-- scanned build page needs comes through the security-definer entry points in
-- this file, each of which enforces visibility/status itself. Owner tooling
-- uses ordinary RLS-protected table access (policies in 0003).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Authorization helpers
-- -----------------------------------------------------------------------------

create or replace function buildtag.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from buildtag.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke execute on function buildtag.is_admin() from public;
grant execute on function buildtag.is_admin() to authenticated;

create or replace function buildtag.owns_vehicle(p_vehicle_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from buildtag.vehicles v
     where v.id = p_vehicle_id and v.owner_id = (select auth.uid())
  );
$$;

revoke execute on function buildtag.owns_vehicle(uuid) from public;
grant execute on function buildtag.owns_vehicle(uuid) to authenticated;

create or replace function buildtag.owns_shop(p_shop_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from buildtag.shops s
     where s.id = p_shop_id and s.owner_id = (select auth.uid())
  );
$$;

revoke execute on function buildtag.owns_shop(uuid) from public;
grant execute on function buildtag.owns_shop(uuid) to authenticated;

-- Storage helper: does the object name "<vehicle_id>/..." belong to a vehicle
-- the caller owns? Returns false (never errors) on malformed names.
create or replace function buildtag.owns_storage_vehicle(p_object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  first_segment text := split_part(p_object_name, '/', 1);
  vid uuid;
begin
  if first_segment !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  vid := first_segment::uuid;
  return exists (
    select 1 from buildtag.vehicles v where v.id = vid and v.owner_id = (select auth.uid())
  );
end;
$$;

revoke execute on function buildtag.owns_storage_vehicle(text) from public;
grant execute on function buildtag.owns_storage_vehicle(text) to authenticated;

-- Plan lookup (subscriptions row is optional; missing = free).
create or replace function buildtag.user_plan(p_user_id uuid)
returns buildtag.plan
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select s.plan from buildtag.subscriptions s
      where s.user_id = p_user_id and s.status in ('active', 'trialing')),
    'free'::buildtag.plan
  );
$$;

revoke execute on function buildtag.user_plan(uuid) from public;
grant execute on function buildtag.user_plan(uuid) to authenticated;

create or replace function buildtag.plan_limits(p_plan buildtag.plan)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'pro' then jsonb_build_object('vehicles', 10, 'photos', 60, 'designs', 25)
    else jsonb_build_object('vehicles', 1, 'photos', 12, 'designs', 5)
  end;
$$;

grant execute on function buildtag.plan_limits(buildtag.plan) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------

create or replace function buildtag.username_available(p_username text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select p_username ~ '^[a-z0-9_]{3,30}$'
     and not exists (select 1 from buildtag.profiles p where lower(p.username) = lower(p_username));
$$;

grant execute on function buildtag.username_available(text) to anon, authenticated;

-- Creates the caller's profile if it does not exist yet. Username comes from
-- the signup metadata when present, otherwise from the email local part, and
-- collisions get a numeric suffix.
create or replace function buildtag.ensure_profile()
returns buildtag.profiles
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing buildtag.profiles;
  meta jsonb;
  base text;
  candidate text;
  n integer := 0;
  email_text text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into existing from buildtag.profiles where id = uid;
  if found then
    return existing;
  end if;

  select u.raw_user_meta_data, u.email into meta, email_text from auth.users u where u.id = uid;

  base := lower(regexp_replace(coalesce(meta ->> 'username', split_part(coalesce(email_text, ''), '@', 1), ''), '[^a-z0-9_]', '', 'g'));
  if char_length(base) < 3 then
    base := 'builder' || lower(buildtag.short_code(4));
  end if;
  base := left(base, 26);

  candidate := base;
  while exists (select 1 from buildtag.profiles p where lower(p.username) = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into buildtag.profiles (id, username, display_name)
  values (uid, candidate, coalesce(nullif(meta ->> 'display_name', ''), initcap(replace(candidate, '_', ' '))))
  returning * into existing;

  return existing;
end;
$$;

revoke execute on function buildtag.ensure_profile() from public;
grant execute on function buildtag.ensure_profile() to authenticated;

-- -----------------------------------------------------------------------------
-- Vehicle lifecycle triggers
-- -----------------------------------------------------------------------------

create or replace function buildtag.generate_vehicle_slug(
  p_year integer, p_make text, p_model text, p_nickname text
)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  base := buildtag.slugify(concat_ws(' ', nullif(p_nickname, ''), p_year::text, p_make, p_model));
  base := left(base, 60);
  if char_length(base) < 3 then
    base := 'build-' || lower(buildtag.short_code(6));
  end if;
  candidate := base;
  while exists (select 1 from buildtag.vehicles v where v.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;
  return candidate;
end;
$$;

create or replace function buildtag.vehicles_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_plan buildtag.plan;
  max_vehicles integer;
  current_count integer;
begin
  if new.slug is null or new.slug = '' then
    new.slug := buildtag.generate_vehicle_slug(new.year, new.make, new.model, new.nickname);
  end if;

  -- Plan limits are enforced here so they cannot be bypassed from the client.
  owner_plan := buildtag.user_plan(new.owner_id);
  max_vehicles := (buildtag.plan_limits(owner_plan) ->> 'vehicles')::integer;
  select count(*) into current_count from buildtag.vehicles v where v.owner_id = new.owner_id;
  if current_count >= max_vehicles and not buildtag.is_admin() then
    raise exception 'vehicle limit reached for plan %', owner_plan using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger vehicles_before_insert
  before insert on buildtag.vehicles
  for each row execute function buildtag.vehicles_before_insert();

-- Every vehicle gets its permanent QR code at birth.
create or replace function buildtag.vehicles_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt integer := 0;
begin
  loop
    begin
      insert into buildtag.qr_codes (vehicle_id, code) values (new.id, buildtag.short_code(8));
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 5 then
        raise;
      end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger vehicles_after_insert
  after insert on buildtag.vehicles
  for each row execute function buildtag.vehicles_after_insert();

-- Photo limit per plan.
create or replace function buildtag.vehicle_photos_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  max_photos integer;
  current_count integer;
begin
  select v.owner_id into owner from buildtag.vehicles v where v.id = new.vehicle_id;
  max_photos := (buildtag.plan_limits(buildtag.user_plan(owner)) ->> 'photos')::integer;
  select count(*) into current_count from buildtag.vehicle_photos p where p.vehicle_id = new.vehicle_id;
  if current_count >= max_photos then
    raise exception 'photo limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger vehicle_photos_before_insert
  before insert on buildtag.vehicle_photos
  for each row execute function buildtag.vehicle_photos_before_insert();

-- Design limit per plan.
create or replace function buildtag.tag_designs_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  max_designs integer;
  current_count integer;
begin
  select v.owner_id into owner from buildtag.vehicles v where v.id = new.vehicle_id;
  max_designs := (buildtag.plan_limits(buildtag.user_plan(owner)) ->> 'designs')::integer;
  select count(*) into current_count from buildtag.tag_designs d where d.vehicle_id = new.vehicle_id;
  if current_count >= max_designs then
    raise exception 'design limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger tag_designs_before_insert
  before insert on buildtag.tag_designs
  for each row execute function buildtag.tag_designs_before_insert();

-- -----------------------------------------------------------------------------
-- Counter maintenance
-- -----------------------------------------------------------------------------

create or replace function buildtag.modifications_count_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update buildtag.vehicles set mod_count = mod_count + 1 where id = new.vehicle_id;
    return new;
  elsif tg_op = 'DELETE' then
    update buildtag.vehicles set mod_count = greatest(mod_count - 1, 0) where id = old.vehicle_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger modifications_count_sync
  after insert or delete on buildtag.modifications
  for each row execute function buildtag.modifications_count_sync();

create or replace function buildtag.scan_events_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update buildtag.vehicles set scan_count = scan_count + 1 where id = new.vehicle_id;
  if new.qr_code_id is not null then
    update buildtag.qr_codes
       set scan_count = scan_count + 1, last_scanned_at = new.occurred_at
     where id = new.qr_code_id;
  end if;
  return new;
end;
$$;

create trigger scan_events_after_insert
  after insert on buildtag.scan_events
  for each row execute function buildtag.scan_events_after_insert();

create or replace function buildtag.build_likes_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update buildtag.vehicles set like_count = like_count + 1 where id = new.vehicle_id;
    return new;
  elsif tg_op = 'DELETE' then
    update buildtag.vehicles set like_count = greatest(like_count - 1, 0) where id = old.vehicle_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger build_likes_sync
  after insert or delete on buildtag.build_likes
  for each row execute function buildtag.build_likes_sync();

create or replace function buildtag.product_clicks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update buildtag.vehicles set click_count = click_count + 1 where id = new.vehicle_id;
  return new;
end;
$$;

create trigger product_clicks_after_insert
  after insert on buildtag.product_clicks
  for each row execute function buildtag.product_clicks_after_insert();

-- -----------------------------------------------------------------------------
-- Public read model
-- -----------------------------------------------------------------------------

-- Explore / sitemap listing. The view is owned by the schema owner and is NOT
-- security_invoker, so anon can read it without table privileges. It only
-- ever exposes public + active vehicles and no database ids.
create or replace view buildtag.public_builds
with (security_invoker = false)
as
  select
    v.slug,
    v.year,
    v.make,
    v.model,
    v.trim,
    v.nickname,
    v.hero_image_url,
    v.horsepower,
    v.horsepower_type,
    v.torque,
    v.torque_unit,
    v.mod_count,
    v.like_count,
    v.scan_count,
    v.created_at,
    v.updated_at,
    p.username as owner_username
  from buildtag.vehicles v
  join buildtag.profiles p on p.id = v.owner_id
  where v.visibility = 'public' and v.status = 'active';

grant select on buildtag.public_builds to anon, authenticated;

-- Full build payload for /build/[slug]. Returns:
--   {"access": "ok", "build": {...}}      readable (public / unlisted)
--   {"access": "private"}                 exists but private (owner sees it)
--   {"access": "disabled"}                moderated
--   {"access": "not_found"}
create or replace function buildtag.get_public_build(p_slug text, p_visitor_key text default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  p buildtag.profiles;
  caller uuid := auth.uid();
  is_owner boolean := false;
  is_admin boolean := false;
  liked boolean := false;
begin
  select * into v from buildtag.vehicles where slug = lower(p_slug);
  if not found then
    return jsonb_build_object('access', 'not_found');
  end if;

  is_owner := caller is not null and caller = v.owner_id;
  if caller is not null then
    is_admin := exists (select 1 from buildtag.admins a where a.user_id = caller);
  end if;

  if v.status = 'disabled' and not (is_owner or is_admin) then
    return jsonb_build_object('access', 'disabled');
  end if;

  if v.visibility = 'private' and not (is_owner or is_admin) then
    return jsonb_build_object('access', 'private');
  end if;

  select * into p from buildtag.profiles where id = v.owner_id;

  if p_visitor_key is not null then
    liked := exists (select 1 from buildtag.build_likes l where l.vehicle_id = v.id and l.visitor_key = p_visitor_key);
  end if;

  return jsonb_build_object(
    'access', 'ok',
    'is_owner', is_owner,
    'liked', liked,
    'build', jsonb_build_object(
      'slug', v.slug,
      'year', v.year,
      'make', v.make,
      'model', v.model,
      'trim', v.trim,
      'nickname', v.nickname,
      'description', v.description,
      'hero_image_url', v.hero_image_url,
      'profile_image_url', v.profile_image_url,
      'location_text', v.location_text,
      'horsepower', v.horsepower,
      'horsepower_type', v.horsepower_type,
      'torque', v.torque,
      'torque_unit', v.torque_unit,
      'mileage', v.mileage,
      'mileage_unit', v.mileage_unit,
      'build_started_year', v.build_started_year,
      'build_cost', case when v.build_cost_public then v.build_cost else null end,
      'build_cost_public', v.build_cost_public,
      'dyno_type', v.dyno_type,
      'visibility', v.visibility,
      'status', v.status,
      'show_owner_section', v.show_owner_section,
      'mod_count', v.mod_count,
      'like_count', v.like_count,
      'scan_count', v.scan_count,
      'created_at', v.created_at,
      'updated_at', v.updated_at,
      'qr_code', (select q.code from buildtag.qr_codes q where q.vehicle_id = v.id and q.status = 'active' order by q.created_at limit 1),
      'photos', coalesce((
        select jsonb_agg(jsonb_build_object(
          'storage_path', ph.storage_path,
          'caption', ph.caption,
          'alt_text', ph.alt_text,
          'width', ph.width,
          'height', ph.height
        ) order by ph.sort_order, ph.created_at)
        from buildtag.vehicle_photos ph where ph.vehicle_id = v.id
      ), '[]'::jsonb),
      'modifications', coalesce((
        select jsonb_agg(jsonb_build_object(
          'public_id', m.public_id,
          'category', m.category,
          'brand', m.brand,
          'part_name', m.part_name,
          'part_number', m.part_number,
          'description', m.description,
          'price', case when m.price_public then m.price else null end,
          'has_link', (m.affiliate_url is not null or m.product_url is not null),
          'installed_by_text', m.installed_by_text,
          'installation_date', m.installation_date,
          'shop', case when s.id is null then null else jsonb_build_object(
            'name', s.name, 'slug', s.slug, 'logo_url', s.logo_url, 'website_url', s.website_url,
            'instagram_handle', s.instagram_handle, 'verified', s.verified, 'location_text', s.location_text
          ) end,
          'part', case when pt.id is null then null else jsonb_build_object(
            'brand', pt.brand, 'name', pt.name, 'slug', pt.slug, 'image_url', pt.image_url
          ) end
        ) order by m.category, m.sort_order, m.created_at)
        from buildtag.modifications m
        left join buildtag.shops s on s.id = m.shop_id
        left join buildtag.parts pt on pt.id = m.part_id
        where m.vehicle_id = v.id
      ), '[]'::jsonb),
      'vehicle_socials', coalesce((
        select jsonb_agg(jsonb_build_object(
          'public_id', sl.public_id, 'platform', sl.platform, 'handle', sl.handle, 'url', sl.url
        ) order by sl.sort_order, sl.created_at)
        from buildtag.social_links sl
        where sl.owner_type = 'vehicle' and sl.owner_id = v.id and sl.is_public
      ), '[]'::jsonb),
      'owner', case when v.show_owner_section then jsonb_build_object(
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'location_text', p.location_text,
        'website_url', p.website_url,
        'socials', coalesce((
          select jsonb_agg(jsonb_build_object(
            'public_id', sl.public_id, 'platform', sl.platform, 'handle', sl.handle, 'url', sl.url
          ) order by sl.sort_order, sl.created_at)
          from buildtag.social_links sl
          where sl.owner_type = 'profile' and sl.owner_id = p.id and sl.is_public
        ), '[]'::jsonb)
      ) else jsonb_build_object('username', p.username) end
    )
  );
end;
$$;

grant execute on function buildtag.get_public_build(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- QR scan resolution: /s/[code]
-- -----------------------------------------------------------------------------

create or replace function buildtag.resolve_scan(
  p_code text,
  p_referrer text default null,
  p_country text default null,
  p_device buildtag.device_type default 'other',
  p_record boolean default true
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  q buildtag.qr_codes;
  v buildtag.vehicles;
begin
  select * into q from buildtag.qr_codes where code = upper(p_code);
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v from buildtag.vehicles where id = q.vehicle_id;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if q.status = 'disabled' then
    return jsonb_build_object('status', 'qr_disabled');
  end if;

  if v.status = 'disabled' then
    return jsonb_build_object('status', 'build_disabled');
  end if;

  if p_record then
    insert into buildtag.scan_events (vehicle_id, qr_code_id, referrer, country, device_type)
    values (v.id, q.id, left(p_referrer, 120), left(p_country, 2), coalesce(p_device, 'other'));
  end if;

  if v.visibility = 'private' then
    return jsonb_build_object('status', 'private');
  end if;

  return jsonb_build_object('status', 'ok', 'slug', v.slug);
end;
$$;

grant execute on function buildtag.resolve_scan(text, text, text, buildtag.device_type, boolean) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Likes (anonymous, one per visitor key per vehicle)
-- -----------------------------------------------------------------------------

create or replace function buildtag.toggle_like(p_slug text, p_visitor_key text)
returns jsonb
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  removed integer;
  liked boolean;
begin
  if p_visitor_key is null or char_length(p_visitor_key) < 16 then
    raise exception 'invalid visitor key' using errcode = '22023';
  end if;

  select * into v from buildtag.vehicles
   where slug = lower(p_slug) and status = 'active' and visibility in ('public', 'unlisted');
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  delete from buildtag.build_likes where vehicle_id = v.id and visitor_key = p_visitor_key;
  get diagnostics removed = row_count;
  if removed > 0 then
    liked := false;
  else
    insert into buildtag.build_likes (vehicle_id, visitor_key) values (v.id, p_visitor_key);
    liked := true;
  end if;

  select like_count into v.like_count from buildtag.vehicles where id = v.id;
  return jsonb_build_object('ok', true, 'liked', liked, 'like_count', v.like_count);
end;
$$;

grant execute on function buildtag.toggle_like(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Outbound click tracking. Returns the destination URL (affiliate preferred).
-- -----------------------------------------------------------------------------

create or replace function buildtag.record_product_click(p_slug text, p_public_id text)
returns text
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  m buildtag.modifications;
  target text;
begin
  select * into v from buildtag.vehicles
   where slug = lower(p_slug) and status = 'active' and visibility in ('public', 'unlisted');
  if not found then return null; end if;

  select * into m from buildtag.modifications where vehicle_id = v.id and public_id = p_public_id;
  if not found then return null; end if;

  target := coalesce(nullif(m.affiliate_url, ''), nullif(m.product_url, ''));
  if target is null then return null; end if;

  insert into buildtag.product_clicks (vehicle_id, modification_id) values (v.id, m.id);
  return target;
end;
$$;

grant execute on function buildtag.record_product_click(text, text) to anon, authenticated;

create or replace function buildtag.record_social_click(p_slug text, p_public_id text)
returns text
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  sl buildtag.social_links;
begin
  select * into v from buildtag.vehicles
   where slug = lower(p_slug) and status = 'active' and visibility in ('public', 'unlisted');
  if not found then return null; end if;

  select * into sl from buildtag.social_links
   where public_id = p_public_id and is_public
     and ((owner_type = 'vehicle' and owner_id = v.id)
       or (owner_type = 'profile' and owner_id = v.owner_id and v.show_owner_section));
  if not found then return null; end if;

  insert into buildtag.social_clicks (vehicle_id, social_link_id) values (v.id, sl.id);
  return sl.url;
end;
$$;

grant execute on function buildtag.record_social_click(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Reports
-- -----------------------------------------------------------------------------

create or replace function buildtag.submit_report(
  p_slug text, p_reason buildtag.report_reason, p_description text, p_reporter_key text
)
returns boolean
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  recent integer;
begin
  select * into v from buildtag.vehicles where slug = lower(p_slug);
  if not found then return false; end if;

  -- Abuse guard: 3 reports per reporter per day, 1 per vehicle per day.
  select count(*) into recent from buildtag.reports r
   where r.reporter_key = p_reporter_key and r.created_at > now() - interval '1 day';
  if recent >= 3 then return false; end if;

  if exists (select 1 from buildtag.reports r where r.vehicle_id = v.id and r.reporter_key = p_reporter_key and r.created_at > now() - interval '1 day') then
    return true;
  end if;

  insert into buildtag.reports (vehicle_id, reason, description, reporter_key)
  values (v.id, p_reason, left(coalesce(p_description, ''), 1000), p_reporter_key);
  return true;
end;
$$;

grant execute on function buildtag.submit_report(text, buildtag.report_reason, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Owner analytics
-- -----------------------------------------------------------------------------

create or replace function buildtag.vehicle_analytics(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  caller uuid := auth.uid();
begin
  select * into v from buildtag.vehicles where id = p_vehicle_id;
  if not found then
    return null;
  end if;
  if caller is null or (v.owner_id <> caller and not exists (select 1 from buildtag.admins a where a.user_id = caller)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_scans', v.scan_count,
    'scans_today', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= date_trunc('day', now())),
    'scans_7d', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= now() - interval '7 days'),
    'scans_30d', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= now() - interval '30 days'),
    'likes', v.like_count,
    'product_clicks', v.click_count,
    'social_clicks', (select count(*) from buildtag.social_clicks c where c.vehicle_id = v.id),
    'scans_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(s.count, 0)) order by d.day)
      from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as d(day)
      left join (
        select occurred_at::date as day, count(*) as count
        from buildtag.scan_events e
        where e.vehicle_id = v.id and e.occurred_at >= (now() - interval '29 days')::date
        group by 1
      ) s on s.day = d.day
    ), '[]'::jsonb),
    'top_parts', coalesce((
      select jsonb_agg(jsonb_build_object('part_name', m.part_name, 'brand', m.brand, 'count', c.count) order by c.count desc)
      from (
        select modification_id, count(*) as count
        from buildtag.product_clicks pc
        where pc.vehicle_id = v.id and pc.modification_id is not null
        group by modification_id
        order by count desc
        limit 8
      ) c
      join buildtag.modifications m on m.id = c.modification_id
    ), '[]'::jsonb),
    'top_socials', coalesce((
      select jsonb_agg(jsonb_build_object('platform', sl.platform, 'handle', sl.handle, 'owner_type', sl.owner_type, 'count', c.count) order by c.count desc)
      from (
        select social_link_id, count(*) as count
        from buildtag.social_clicks sc
        where sc.vehicle_id = v.id and sc.social_link_id is not null
        group by social_link_id
        order by count desc
        limit 8
      ) c
      join buildtag.social_links sl on sl.id = c.social_link_id
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_object_agg(device_type, count)
      from (
        select device_type, count(*) as count
        from buildtag.scan_events e where e.vehicle_id = v.id
        group by device_type
      ) d
    ), '{}'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('country', country, 'count', count) order by count desc)
      from (
        select coalesce(country, '??') as country, count(*) as count
        from buildtag.scan_events e where e.vehicle_id = v.id
        group by 1 order by 2 desc limit 8
      ) c
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function buildtag.vehicle_analytics(uuid) from public;
grant execute on function buildtag.vehicle_analytics(uuid) to authenticated;

create or replace function buildtag.dashboard_stats()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'vehicles', count(*),
    'scans', coalesce(sum(scan_count), 0),
    'likes', coalesce(sum(like_count), 0),
    'clicks', coalesce(sum(click_count), 0)
  )
  from buildtag.vehicles v where v.owner_id = (select auth.uid());
$$;

revoke execute on function buildtag.dashboard_stats() from public;
grant execute on function buildtag.dashboard_stats() to authenticated;

-- -----------------------------------------------------------------------------
-- Admin tooling (every function re-checks buildtag.is_admin())
-- -----------------------------------------------------------------------------

create or replace function buildtag.admin_search_users(p_query text, p_limit integer default 25)
returns table (id uuid, username text, display_name text, email text, created_at timestamptz, vehicle_count bigint)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not buildtag.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, p.username, p.display_name, u.email::text, p.created_at,
           (select count(*) from buildtag.vehicles v where v.owner_id = p.id)
      from buildtag.profiles p
      join auth.users u on u.id = p.id
     where p_query is null or p_query = ''
        or p.username ilike '%' || p_query || '%'
        or p.display_name ilike '%' || p_query || '%'
        or u.email ilike '%' || p_query || '%'
     order by p.created_at desc
     limit least(greatest(p_limit, 1), 100);
end;
$$;

revoke execute on function buildtag.admin_search_users(text, integer) from public;
grant execute on function buildtag.admin_search_users(text, integer) to authenticated;

create or replace function buildtag.admin_set_vehicle_status(p_vehicle_id uuid, p_status buildtag.vehicle_status)
returns void
language plpgsql
security definer
volatile
set search_path = ''
as $$
begin
  if not buildtag.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update buildtag.vehicles set status = p_status where id = p_vehicle_id;
end;
$$;

revoke execute on function buildtag.admin_set_vehicle_status(uuid, buildtag.vehicle_status) from public;
grant execute on function buildtag.admin_set_vehicle_status(uuid, buildtag.vehicle_status) to authenticated;

create or replace function buildtag.admin_set_qr_status(p_qr_id uuid, p_status buildtag.qr_status)
returns void
language plpgsql
security definer
volatile
set search_path = ''
as $$
begin
  if not buildtag.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update buildtag.qr_codes set status = p_status where id = p_qr_id;
end;
$$;

revoke execute on function buildtag.admin_set_qr_status(uuid, buildtag.qr_status) from public;
grant execute on function buildtag.admin_set_qr_status(uuid, buildtag.qr_status) to authenticated;

create or replace function buildtag.admin_update_report(p_report_id uuid, p_status buildtag.report_status, p_note text default null)
returns void
language plpgsql
security definer
volatile
set search_path = ''
as $$
begin
  if not buildtag.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update buildtag.reports
     set status = p_status,
         admin_note = coalesce(p_note, admin_note)
   where id = p_report_id;
end;
$$;

revoke execute on function buildtag.admin_update_report(uuid, buildtag.report_status, text) from public;
grant execute on function buildtag.admin_update_report(uuid, buildtag.report_status, text) to authenticated;

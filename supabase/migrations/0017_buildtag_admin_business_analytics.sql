-- =============================================================================
-- 0017: admin-provisioned business accounts and business analytics.
-- =============================================================================
--   * BuildTags admins can create a business directly (already active, for a
--     customer or for testing), name its owner by username or email, add or
--     remove members on any business, and add themselves to one to test the
--     business dashboard.
--   * Naming someone by an email that has no account yet stores an invite.
--     The invite turns into a membership the first time that person loads the
--     dashboard with a CONFIRMED email address. Only admins can read invites.
--   * org_analytics() gives a business aggregate numbers for the builds it is
--     attached to and the parts it recorded or installed: scans, part clicks,
--     top parts, devices, countries. Counts only, never individual visitors,
--     and parts the owner hid are left out.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Invites for people who do not have an account yet
-- -----------------------------------------------------------------------------
create table buildtag.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references buildtag.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role buildtag.org_member_role not null default 'owner',
  invited_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users (id) on delete set null
);
create unique index organization_invites_one_open on buildtag.organization_invites (organization_id, email) where accepted_at is null;
create index organization_invites_email_idx on buildtag.organization_invites (email) where accepted_at is null;

alter table buildtag.organization_invites enable row level security;
grant select on buildtag.organization_invites to authenticated;
create policy organization_invites_admin_select on buildtag.organization_invites for select to authenticated using (buildtag.is_admin());
-- writes go through the admin_* functions below

-- -----------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- -----------------------------------------------------------------------------
-- '@name' or 'name' is a username; anything else with an @ is an email.
create or replace function buildtag.find_user_by_identifier(p_identifier text)
returns uuid language sql stable security definer set search_path = ''
as $$
  select case
    when position('@' in trim(coalesce(p_identifier, ''))) > 1 then
      (select u.id from auth.users u where lower(u.email) = lower(trim(p_identifier)) order by u.created_at limit 1)
    else
      (select p.id from buildtag.profiles p where lower(p.username) = lower(trim(leading '@' from trim(coalesce(p_identifier, '')))))
  end;
$$;
revoke execute on function buildtag.find_user_by_identifier(text) from public;

create or replace function buildtag.unique_org_slug(p_name text)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  base text := left(buildtag.slugify(p_name), 60);
  candidate text;
  n integer := 0;
begin
  if char_length(base) < 2 then base := 'shop-' || lower(buildtag.short_code(5)); end if;
  candidate := base;
  while exists (select 1 from buildtag.organizations x where x.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;
  return candidate;
end;
$$;
revoke execute on function buildtag.unique_org_slug(text) from public;

-- Adds the user, or reactivates them. Never lowers an existing active role.
create or replace function buildtag.upsert_org_member(p_org uuid, p_user uuid, p_role buildtag.org_member_role, p_added_by uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into buildtag.organization_members as m (organization_id, user_id, role, status, added_by_user_id)
  values (p_org, p_user, p_role, 'active', p_added_by)
  on conflict (organization_id, user_id) do update
    set role = case when m.status = 'removed' or buildtag.org_role_rank(excluded.role) > buildtag.org_role_rank(m.role) then excluded.role else m.role end,
        status = 'active',
        added_by_user_id = excluded.added_by_user_id;
$$;
revoke execute on function buildtag.upsert_org_member(uuid, uuid, buildtag.org_member_role, uuid) from public;

-- Returns 'added' (existing account) or 'invited' (email without an account).
create or replace function buildtag.add_or_invite_org_member(p_org uuid, p_identifier text, p_role buildtag.org_member_role)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  target uuid := buildtag.find_user_by_identifier(p_identifier);
  em text := lower(trim(coalesce(p_identifier, '')));
begin
  if target is not null then
    perform buildtag.upsert_org_member(p_org, target, p_role, auth.uid());
    return 'added';
  end if;
  if position('@' in em) > 1 then
    if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(em) > 200 then
      raise exception 'Enter a valid email address.' using errcode = 'P0001';
    end if;
    insert into buildtag.organization_invites (organization_id, email, role, invited_by_user_id)
    values (p_org, em, p_role, auth.uid())
    on conflict (organization_id, email) where accepted_at is null
    do update set role = excluded.role, invited_by_user_id = excluded.invited_by_user_id, created_at = now();
    return 'invited';
  end if;
  raise exception 'No BuildTags user with that username. Use their email to invite them instead.' using errcode = 'P0001';
end;
$$;
revoke execute on function buildtag.add_or_invite_org_member(uuid, text, buildtag.org_member_role) from public;

-- -----------------------------------------------------------------------------
-- Invite acceptance: runs inside my_organizations(), which the dashboard
-- already calls on every load, so no extra round trip.
-- -----------------------------------------------------------------------------
create or replace function buildtag.accept_organization_invites()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  inv record;
  n integer := 0;
begin
  if uid is null then return 0; end if;
  select lower(u.email) into em from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if em is null then return 0; end if;
  for inv in
    select * from buildtag.organization_invites i
     where i.email = em and i.accepted_at is null
     for update skip locked
  loop
    perform buildtag.upsert_org_member(inv.organization_id, uid, inv.role, inv.invited_by_user_id);
    update buildtag.organization_invites set accepted_at = now(), accepted_by_user_id = uid where id = inv.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function buildtag.accept_organization_invites() from public;
grant execute on function buildtag.accept_organization_invites() to authenticated;

-- Same output as 0014; now volatile so it can accept pending invites first.
create or replace function buildtag.my_organizations()
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from buildtag.organization_invites i where i.accepted_at is null
              and i.email = (select lower(u.email) from auth.users u where u.id = auth.uid())) then
    perform buildtag.accept_organization_invites();
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'slug', o.slug, 'organization_type', o.organization_type, 'status', o.status,
      'verified_status', o.verified_status, 'logo_url', o.logo_url, 'role', m.role
    ) order by o.name), '[]'::jsonb)
    from buildtag.organization_members m join buildtag.organizations o on o.id = m.organization_id
    where m.user_id = auth.uid() and m.status = 'active'
  );
end;
$$;
revoke execute on function buildtag.my_organizations() from public;
grant execute on function buildtag.my_organizations() to authenticated;

-- -----------------------------------------------------------------------------
-- Admin: create a business and manage its members
-- -----------------------------------------------------------------------------
create or replace function buildtag.admin_create_organization(
  p_name text,
  p_type buildtag.organization_type default 'other',
  p_owner text default '',
  p_status buildtag.organization_status default 'active',
  p_verified buildtag.verification_status default 'unverified',
  p_details jsonb default '{}'::jsonb,
  p_add_self buildtag.org_member_role default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  o buildtag.organizations;
  owner_result text := null;
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Enter the business name.' using errcode = 'P0001'; end if;
  if nullif(trim(coalesce(p_owner, '')), '') is not null
     and buildtag.find_user_by_identifier(p_owner) is null and position('@' in trim(p_owner)) <= 1 then
    raise exception 'No BuildTags user with that username. Use their email to invite them instead.' using errcode = 'P0001';
  end if;

  insert into buildtag.organizations (created_by_user_id, name, slug, organization_type, status, verified_status, description, website_url,
                                      location_text, city, region, country, phone, email)
  values (uid, left(trim(p_name), 80), buildtag.unique_org_slug(p_name), coalesce(p_type, 'other'),
          coalesce(p_status, 'active'), coalesce(p_verified, 'unverified'),
          left(coalesce(p_details ->> 'description', ''), 1000),
          nullif(left(coalesce(p_details ->> 'website_url', ''), 300), ''),
          left(coalesce(p_details ->> 'location_text', ''), 80),
          left(coalesce(p_details ->> 'city', ''), 80), left(coalesce(p_details ->> 'region', ''), 80),
          coalesce(nullif(upper(left(p_details ->> 'country', 2)), ''), 'US'),
          left(coalesce(p_details ->> 'phone', ''), 40), left(coalesce(p_details ->> 'email', ''), 200))
  returning * into o;

  if nullif(trim(coalesce(p_owner, '')), '') is not null then
    owner_result := buildtag.add_or_invite_org_member(o.id, p_owner, 'owner');
  end if;
  if p_add_self is not null then
    perform buildtag.upsert_org_member(o.id, uid, p_add_self, uid);
  end if;

  return jsonb_build_object('id', o.id, 'slug', o.slug, 'owner', owner_result);
end;
$$;
revoke execute on function buildtag.admin_create_organization(text, buildtag.organization_type, text, buildtag.organization_status, buildtag.verification_status, jsonb, buildtag.org_member_role) from public;
grant execute on function buildtag.admin_create_organization(text, buildtag.organization_type, text, buildtag.organization_status, buildtag.verification_status, jsonb, buildtag.org_member_role) to authenticated;

create or replace function buildtag.admin_add_org_member(p_org uuid, p_identifier text, p_role buildtag.org_member_role default 'staff')
returns text language plpgsql security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from buildtag.organizations o where o.id = p_org) then raise exception 'No such business.' using errcode = 'P0001'; end if;
  return buildtag.add_or_invite_org_member(p_org, p_identifier, coalesce(p_role, 'staff'));
end;
$$;
revoke execute on function buildtag.admin_add_org_member(uuid, text, buildtag.org_member_role) from public;
grant execute on function buildtag.admin_add_org_member(uuid, text, buildtag.org_member_role) to authenticated;

create or replace function buildtag.admin_set_org_member(p_org uuid, p_user_id uuid, p_role buildtag.org_member_role default null, p_remove boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update buildtag.organization_members
     set role = coalesce(p_role, role),
         status = case when p_remove then 'removed'::buildtag.org_member_status else status end
   where organization_id = p_org and user_id = p_user_id;
  if not found then raise exception 'Not a member of this business.' using errcode = 'P0001'; end if;
end;
$$;
revoke execute on function buildtag.admin_set_org_member(uuid, uuid, buildtag.org_member_role, boolean) from public;
grant execute on function buildtag.admin_set_org_member(uuid, uuid, buildtag.org_member_role, boolean) to authenticated;

create or replace function buildtag.admin_revoke_org_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from buildtag.organization_invites where id = p_invite_id and accepted_at is null;
end;
$$;
revoke execute on function buildtag.admin_revoke_org_invite(uuid) from public;
grant execute on function buildtag.admin_revoke_org_invite(uuid) to authenticated;

create or replace function buildtag.admin_organization_detail(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare o buildtag.organizations;
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into o from buildtag.organizations where id = p_org;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', o.id, 'name', o.name, 'slug', o.slug, 'organization_type', o.organization_type, 'status', o.status,
    'verified_status', o.verified_status, 'created_at', o.created_at, 'email', o.email, 'phone', o.phone,
    'website_url', o.website_url, 'location_text', o.location_text,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'username', p.username, 'display_name', p.display_name,
                                          'email', u.email, 'role', m.role, 'created_at', m.created_at)
                       order by buildtag.org_role_rank(m.role) desc, m.created_at)
        from buildtag.organization_members m
        join auth.users u on u.id = m.user_id
        left join buildtag.profiles p on p.id = m.user_id
       where m.organization_id = o.id and m.status = 'active'
    ), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'role', i.role, 'created_at', i.created_at) order by i.created_at desc)
        from buildtag.organization_invites i where i.organization_id = o.id and i.accepted_at is null
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function buildtag.admin_organization_detail(uuid) from public;
grant execute on function buildtag.admin_organization_detail(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Business analytics
-- -----------------------------------------------------------------------------
-- Builds in scope: every vehicle the business has a current relationship with
-- (creator, builder, dealer, installer, ...) or recorded/installed a part on.
-- Parts in scope: modifications the business recorded or is credited as the
-- installer for, excluding ones the owner hid.
create or replace function buildtag.org_analytics(p_org uuid, p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  d integer := least(greatest(coalesce(p_days, 30), 1), 365);
  since timestamptz := date_trunc('day', now()) - make_interval(days => d - 1);
begin
  if not (buildtag.is_org_member(p_org, 'staff') or buildtag.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return (
    with veh as (
      select v.id, v.slug, v.year, v.make, v.model, v.nickname, v.visibility, v.status, v.scan_count, v.ownership_status
        from buildtag.vehicles v
       where exists (select 1 from buildtag.vehicle_relationships r where r.vehicle_id = v.id and r.organization_id = p_org and r.ended_at is null)
          or exists (select 1 from buildtag.modifications m where m.vehicle_id = v.id
                      and (m.created_by_organization_id = p_org or m.installed_by_organization_id = p_org))
    ),
    mods as (
      select m.id, m.vehicle_id, m.category, m.brand, m.part_name, m.product_url, m.affiliate_url
        from buildtag.modifications m join veh on veh.id = m.vehicle_id
       where (m.created_by_organization_id = p_org or m.installed_by_organization_id = p_org) and not m.is_hidden
    ),
    scans as (
      select e.vehicle_id, e.occurred_at, e.device_type, e.country
        from buildtag.scan_events e join veh on veh.id = e.vehicle_id
       where e.occurred_at >= since
    ),
    clicks as (
      select pc.modification_id, pc.vehicle_id, pc.occurred_at
        from buildtag.product_clicks pc join mods on mods.id = pc.modification_id
    )
    select jsonb_build_object(
      'days', d,
      'vehicles', (select count(*) from veh),
      'vehicles_scanned', (select count(distinct vehicle_id) from scans),
      'scans_all_time', coalesce((select sum(scan_count) from veh), 0),
      'scans', (select count(*) from scans),
      'scans_7d', (select count(*) from scans where occurred_at >= now() - interval '7 days'),
      'scans_today', (select count(*) from scans where occurred_at >= date_trunc('day', now())),
      'parts', (select count(*) from mods),
      'parts_linked', (select count(*) from mods where nullif(product_url, '') is not null or nullif(affiliate_url, '') is not null),
      'part_clicks_all_time', (select count(*) from clicks),
      'part_clicks', (select count(*) from clicks where occurred_at >= since),
      'scans_by_day', coalesce((
        select jsonb_agg(jsonb_build_object('day', g.day, 'count', coalesce(s.count, 0)) order by g.day)
          from generate_series(since::date, now()::date, interval '1 day') as g(day)
          left join (select occurred_at::date as day, count(*) as count from scans group by 1) s on s.day = g.day
      ), '[]'::jsonb),
      'top_parts', coalesce((
        select jsonb_agg(jsonb_build_object('brand', t.brand, 'part_name', t.part_name, 'category', t.category,
                                            'installs', t.installs, 'vehicles', t.vehicles, 'clicks', t.clicks)
                         order by t.clicks desc, t.installs desc, t.part_name)
          from (
            select min(mods.brand) as brand, min(mods.part_name) as part_name, min(mods.category::text) as category,
                   count(distinct mods.id) as installs, count(distinct mods.vehicle_id) as vehicles,
                   count(c.modification_id) as clicks
              from mods left join clicks c on c.modification_id = mods.id and c.occurred_at >= since
             group by lower(mods.brand), lower(mods.part_name)
             order by count(c.modification_id) desc, count(distinct mods.id) desc
             limit 12
          ) t
      ), '[]'::jsonb),
      'categories', coalesce((
        select jsonb_agg(jsonb_build_object('category', t.category, 'installs', t.installs, 'clicks', t.clicks) order by t.clicks desc, t.installs desc)
          from (
            select mods.category::text as category, count(distinct mods.id) as installs, count(c.modification_id) as clicks
              from mods left join clicks c on c.modification_id = mods.id and c.occurred_at >= since
             group by mods.category
          ) t
      ), '[]'::jsonb),
      'top_vehicles', coalesce((
        select jsonb_agg(jsonb_build_object('vehicle_id', t.id, 'slug', t.slug, 'year', t.year, 'make', t.make, 'model', t.model,
                                            'nickname', t.nickname, 'is_public', t.is_public, 'ownership_status', t.ownership_status,
                                            'scans', t.scans, 'part_clicks', t.part_clicks)
                         order by t.scans desc, t.part_clicks desc)
          from (select * from (
            select veh.id, veh.slug, veh.year, veh.make, veh.model, veh.nickname, veh.ownership_status,
                   (veh.visibility <> 'private' and veh.status = 'active') as is_public,
                   (select count(*) from scans s where s.vehicle_id = veh.id) as scans,
                   (select count(*) from clicks c where c.vehicle_id = veh.id and c.occurred_at >= since) as part_clicks
              from veh
          ) x where x.scans > 0 or x.part_clicks > 0 order by x.scans desc, x.part_clicks desc limit 10) t
      ), '[]'::jsonb),
      'devices', coalesce((select jsonb_object_agg(device_type, count) from (select device_type, count(*) as count from scans group by device_type) x), '{}'::jsonb),
      'countries', coalesce((
        select jsonb_agg(jsonb_build_object('country', country, 'count', count) order by count desc)
          from (select coalesce(country, '??') as country, count(*) as count from scans group by 1 order by 2 desc limit 8) x
      ), '[]'::jsonb)
    )
  );
end;
$$;
revoke execute on function buildtag.org_analytics(uuid, integer) from public;
grant execute on function buildtag.org_analytics(uuid, integer) to authenticated;

notify pgrst, 'reload schema';

-- 0009: language + region on profiles, and Pro crews.

-- ---------------------------------------------------------------------------
-- Language / region
-- ---------------------------------------------------------------------------
alter table buildtag.profiles
  add column if not exists locale text not null default 'en'
    check (locale in ('en', 'fr', 'de', 'es', 'th')),
  add column if not exists region text not null default 'US'
    check (char_length(region) between 2 and 8);

-- ensure_profile() now seeds locale/region from the sign-up metadata.
create or replace function buildtag.ensure_profile()
returns buildtag.profiles
language plpgsql
security definer
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
  attempt integer := 0;
  v_locale text;
  v_region text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into existing from buildtag.profiles where id = uid;
  if found then
    return existing;
  end if;

  select u.raw_user_meta_data, u.email into meta, email_text from auth.users u where u.id = uid;

  v_locale := case when (meta ->> 'locale') in ('en', 'fr', 'de', 'es', 'th') then meta ->> 'locale' else 'en' end;
  v_region := coalesce(nullif(upper(left(regexp_replace(meta ->> 'region', '[^A-Za-z]', '', 'g'), 8)), ''), 'US');

  base := lower(regexp_replace(coalesce(meta ->> 'username', split_part(coalesce(email_text, ''), '@', 1), ''), '[^a-z0-9_]', '', 'g'));
  if char_length(base) < 3 then
    base := 'builder' || lower(buildtag.short_code(4));
  end if;
  base := left(base, 26);

  loop
    attempt := attempt + 1;
    candidate := base;
    n := 0;
    while exists (select 1 from buildtag.profiles p where lower(p.username) = candidate) loop
      n := n + 1;
      candidate := base || n::text;
    end loop;

    begin
      insert into buildtag.profiles (id, username, display_name, locale, region)
      values (uid, candidate, coalesce(nullif(meta ->> 'display_name', ''), initcap(replace(candidate, '_', ' '))), v_locale, v_region)
      on conflict (id) do nothing
      returning * into existing;
      exit;
    exception
      when unique_violation then
        if attempt >= 5 then
          raise;
        end if;
    end;
  end loop;

  if existing.id is null then
    select * into existing from buildtag.profiles where id = uid;
  end if;

  return existing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Crews (Pro feature): one crew per owner, members join by username.
-- ---------------------------------------------------------------------------
create table if not exists buildtag.crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,48}$'),
  tagline text not null default '' check (char_length(tagline) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists buildtag.crew_members (
  crew_id uuid not null references buildtag.crews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create unique index if not exists crew_members_one_crew_per_user on buildtag.crew_members (user_id);

alter table buildtag.crews enable row level security;
alter table buildtag.crew_members enable row level security;

drop policy if exists crews_select on buildtag.crews;
create policy crews_select on buildtag.crews for select to authenticated using (true);
drop policy if exists crew_members_select on buildtag.crew_members;
create policy crew_members_select on buildtag.crew_members for select to authenticated using (true);
grant select on buildtag.crews, buildtag.crew_members to authenticated;
-- all writes go through the functions below

create or replace function buildtag.crew_slugify(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')), 40);
$$;

-- Create the caller's crew (Pro only, one per user, caller must not be in another crew).
create or replace function buildtag.create_crew(p_name text, p_tagline text default '')
returns buildtag.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  base text;
  candidate text;
  n integer := 0;
  c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if buildtag.user_plan(uid) <> 'pro' then
    raise exception 'Crews are a Pro feature.' using errcode = 'P0001';
  end if;
  if exists (select 1 from buildtag.crew_members m where m.user_id = uid) then
    raise exception 'You are already in a crew. Leave it first.' using errcode = 'P0001';
  end if;
  base := buildtag.crew_slugify(p_name);
  if char_length(base) < 2 then base := 'crew-' || lower(buildtag.short_code(4)); end if;
  candidate := base;
  while exists (select 1 from buildtag.crews x where x.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;
  insert into buildtag.crews (owner_id, name, slug, tagline)
  values (uid, trim(p_name), candidate, coalesce(left(trim(p_tagline), 140), ''))
  returning * into c;
  insert into buildtag.crew_members (crew_id, user_id, role) values (c.id, uid, 'owner');
  return c;
end;
$$;
revoke execute on function buildtag.create_crew(text, text) from public;
grant execute on function buildtag.create_crew(text, text) to authenticated;

create or replace function buildtag.update_crew(p_name text, p_tagline text)
returns buildtag.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  update buildtag.crews set name = trim(p_name), tagline = coalesce(left(trim(p_tagline), 140), ''), updated_at = now()
   where owner_id = uid returning * into c;
  if c.id is null then raise exception 'You do not own a crew.' using errcode = 'P0001'; end if;
  return c;
end;
$$;
revoke execute on function buildtag.update_crew(text, text) from public;
grant execute on function buildtag.update_crew(text, text) to authenticated;

-- Owner adds a member by username (max 25 members).
create or replace function buildtag.crew_add_member(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
  target uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into c from buildtag.crews where owner_id = uid;
  if not found then raise exception 'Create a crew first.' using errcode = 'P0001'; end if;
  if buildtag.user_plan(uid) <> 'pro' then raise exception 'Crews are a Pro feature. Renew Pro to manage members.' using errcode = 'P0001'; end if;
  select id into target from buildtag.profiles where lower(username) = lower(trim(leading '@' from trim(p_username)));
  if target is null then raise exception 'No BuildTag user with that username.' using errcode = 'P0001'; end if;
  if target = uid then raise exception 'You are already the crew owner.' using errcode = 'P0001'; end if;
  if exists (select 1 from buildtag.crew_members m where m.user_id = target) then
    raise exception 'That user is already in a crew.' using errcode = 'P0001';
  end if;
  if (select count(*) from buildtag.crew_members m where m.crew_id = c.id) >= 25 then
    raise exception 'Crews are capped at 25 members.' using errcode = 'P0001';
  end if;
  insert into buildtag.crew_members (crew_id, user_id, role) values (c.id, target, 'member');
end;
$$;
revoke execute on function buildtag.crew_add_member(text) from public;
grant execute on function buildtag.crew_add_member(text) to authenticated;

-- Owner removes a member, or a member removes themself.
create or replace function buildtag.crew_remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select c2.* into c from buildtag.crews c2 join buildtag.crew_members m on m.crew_id = c2.id where m.user_id = p_user_id;
  if not found then return; end if;
  if c.owner_id = p_user_id then raise exception 'The owner cannot leave. Delete the crew instead.' using errcode = 'P0001'; end if;
  if uid <> c.owner_id and uid <> p_user_id then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from buildtag.crew_members where crew_id = c.id and user_id = p_user_id;
end;
$$;
revoke execute on function buildtag.crew_remove_member(uuid) from public;
grant execute on function buildtag.crew_remove_member(uuid) to authenticated;

create or replace function buildtag.delete_crew()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from buildtag.crews where owner_id = uid;
end;
$$;
revoke execute on function buildtag.delete_crew() from public;
grant execute on function buildtag.delete_crew() to authenticated;

-- Public crew page payload (anon ok): crew, members and their public builds.
create or replace function buildtag.get_crew(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare c buildtag.crews;
begin
  select * into c from buildtag.crews where slug = lower(p_slug);
  if not found then return null; end if;
  return jsonb_build_object(
    'id', c.id, 'name', c.name, 'slug', c.slug, 'tagline', c.tagline, 'created_at', c.created_at,
    'owner_username', (select p.username from buildtag.profiles p where p.id = c.owner_id),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
        'role', m.role, 'joined_at', m.joined_at
      ) order by (m.role = 'owner') desc, m.joined_at)
      from buildtag.crew_members m join buildtag.profiles p on p.id = m.user_id where m.crew_id = c.id
    ), '[]'::jsonb),
    'builds', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.scan_count desc, b.created_at)
      from buildtag.public_builds b
      where b.owner_username in (select p.username from buildtag.crew_members m join buildtag.profiles p on p.id = m.user_id where m.crew_id = c.id)
    ), '[]'::jsonb),
    'total_scans', coalesce((
      select sum(b.scan_count) from buildtag.public_builds b
      where b.owner_username in (select p.username from buildtag.crew_members m join buildtag.profiles p on p.id = m.user_id where m.crew_id = c.id)
    ), 0)
  );
end;
$$;
revoke execute on function buildtag.get_crew(text) from public;
grant execute on function buildtag.get_crew(text) to anon, authenticated;

-- Crew badge for a build page (anon ok).
create or replace function buildtag.build_crew(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', c.name, 'slug', c.slug)
  from buildtag.vehicles v
  join buildtag.crew_members m on m.user_id = v.owner_id
  join buildtag.crews c on c.id = m.crew_id
  where v.slug = lower(p_slug)
  limit 1;
$$;
revoke execute on function buildtag.build_crew(text) from public;
grant execute on function buildtag.build_crew(text) to anon, authenticated;

-- The caller's crew (owner or member), for the dashboard.
create or replace function buildtag.my_crew()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select buildtag.get_crew(c.slug)
  from buildtag.crews c
  join buildtag.crew_members m on m.crew_id = c.id
  where m.user_id = auth.uid()
  limit 1;
$$;
revoke execute on function buildtag.my_crew() from public;
grant execute on function buildtag.my_crew() to authenticated;

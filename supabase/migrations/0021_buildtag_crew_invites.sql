-- 0021: crew invite links. The owner of a personal crew gets one shareable
-- code; anyone signed in who isn't already in a crew can join with it.
-- Codes live in their own table with no grants, so they are only reachable
-- through the security-definer functions below.

create table if not exists buildtag.crew_invites (
  crew_id uuid primary key references buildtag.crews (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table buildtag.crew_invites enable row level security;
revoke all on buildtag.crew_invites from public, anon, authenticated;

-- The caller's invite code (created on first use). p_reset replaces it, which
-- turns every link shared so far into a dead link.
create or replace function buildtag.crew_invite(p_reset boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
  v_code text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into c from buildtag.crews where owner_id = uid and organization_id is null;
  if not found then raise exception 'Create a crew first.' using errcode = 'P0001'; end if;
  if buildtag.user_plan(uid) <> 'pro' then raise exception 'Crews are a Pro feature. Renew Pro to manage members.' using errcode = 'P0001'; end if;
  if p_reset then delete from buildtag.crew_invites where crew_id = c.id; end if;
  select code into v_code from buildtag.crew_invites where crew_id = c.id;
  if v_code is null then
    insert into buildtag.crew_invites (crew_id, code) values (c.id, buildtag.short_code(10)) returning code into v_code;
  end if;
  return v_code;
end;
$$;
revoke execute on function buildtag.crew_invite(boolean) from public;
grant execute on function buildtag.crew_invite(boolean) to authenticated;

-- What an invite link shows before joining (anon ok). Null for a dead code.
create or replace function buildtag.crew_invite_preview(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
  n integer;
  is_member boolean := false;
begin
  select cr.* into c from buildtag.crew_invites i join buildtag.crews cr on cr.id = i.crew_id
   where i.code = upper(trim(p_code)) and cr.organization_id is null;
  if not found then return null; end if;
  select count(*) into n from buildtag.crew_members m where m.crew_id = c.id;
  if uid is not null then
    is_member := exists (select 1 from buildtag.crew_members m where m.crew_id = c.id and m.user_id = uid);
  end if;
  return jsonb_build_object(
    'name', c.name, 'slug', c.slug, 'tagline', c.tagline,
    'owner_username', (select p.username from buildtag.profiles p where p.id = c.owner_id),
    'member_count', n,
    'full', n >= 25,
    'already_member', is_member,
    'in_other_crew', uid is not null and not is_member and buildtag.is_personal_crew_member(uid)
  );
end;
$$;
revoke execute on function buildtag.crew_invite_preview(text) from public;
grant execute on function buildtag.crew_invite_preview(text) to anon, authenticated;

-- Join the crew behind an invite code.
create or replace function buildtag.crew_join(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c buildtag.crews;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select cr.* into c from buildtag.crew_invites i join buildtag.crews cr on cr.id = i.crew_id
   where i.code = upper(trim(p_code)) and cr.organization_id is null;
  if not found then raise exception 'This invite link is no longer valid. Ask the crew owner for a new one.' using errcode = 'P0001'; end if;
  if exists (select 1 from buildtag.crew_members m where m.crew_id = c.id and m.user_id = uid) then
    return jsonb_build_object('slug', c.slug, 'name', c.name);
  end if;
  if buildtag.is_personal_crew_member(uid) then
    raise exception 'You are already in a crew. Leave it first, then use this link again.' using errcode = 'P0001';
  end if;
  if buildtag.user_plan(c.owner_id) <> 'pro' then
    raise exception 'This crew is not taking new members right now.' using errcode = 'P0001';
  end if;
  if (select count(*) from buildtag.crew_members m where m.crew_id = c.id) >= 25 then
    raise exception 'This crew is full (25 members).' using errcode = 'P0001';
  end if;
  insert into buildtag.crew_members (crew_id, user_id, role) values (c.id, uid, 'member');
  return jsonb_build_object('slug', c.slug, 'name', c.name);
end;
$$;
revoke execute on function buildtag.crew_join(text) from public;
grant execute on function buildtag.crew_join(text) to authenticated;

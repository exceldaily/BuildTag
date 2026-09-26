-- =============================================================================
-- 0020: admins can ban accounts and email addresses.
-- =============================================================================
--   * Banning an account sets auth.users.banned_until (Supabase Auth refuses
--     sign-in and token refresh), ends its sessions, and, by default, hides
--     its public builds and bans its email so it can't sign up again. The app
--     also checks my_account_status() on every signed-in page, so an access
--     token that is still valid stops working at once.
--   * Unbanning reverses exactly that: sign-in allowed again, the builds the
--     ban hid are shown again, the email ban it added is lifted.
--   * Banning an email address blocks new accounts (and email changes) to it.
--   * Admins can't ban themselves or another admin (remove admin first).
-- =============================================================================

create table buildtag.banned_emails (
  email text primary key check (email = lower(email) and char_length(email) <= 200),
  reason text not null default '' check (char_length(reason) <= 500),
  banned_by_user_id uuid references auth.users (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,  -- set when added by an account ban
  created_at timestamptz not null default now()
);

create table buildtag.account_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  banned_by_user_id uuid references auth.users (id) on delete set null,
  hidden_vehicle_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table buildtag.banned_emails enable row level security;
alter table buildtag.account_bans enable row level security;
grant select on buildtag.banned_emails, buildtag.account_bans to authenticated;
create policy banned_emails_admin_select on buildtag.banned_emails for select to authenticated using (buildtag.is_admin());
create policy account_bans_admin_select on buildtag.account_bans for select to authenticated using (buildtag.is_admin());
-- writes go through the admin_* functions below

-- Sign-up / email change to a banned address fails.
create or replace function buildtag.block_banned_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is not null and exists (select 1 from buildtag.banned_emails b where b.email = lower(new.email)) then
    raise exception 'This email address can''t be used for a BuildTags account.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists buildtag_block_banned_email on auth.users;
create trigger buildtag_block_banned_email before insert or update of email on auth.users
  for each row execute function buildtag.block_banned_email();

-- Friendly check for the sign-up form (the trigger is the real gate).
create or replace function buildtag.email_is_banned(p_email text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from buildtag.banned_emails b where b.email = lower(trim(coalesce(p_email, ''))));
$$;
revoke execute on function buildtag.email_is_banned(text) from public;
grant execute on function buildtag.email_is_banned(text) to anon, authenticated;

create or replace function buildtag.my_account_status()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('banned', exists (select 1 from buildtag.account_bans b where b.user_id = auth.uid()));
$$;
revoke execute on function buildtag.my_account_status() from public;
grant execute on function buildtag.my_account_status() to authenticated;

create or replace function buildtag.admin_ban_user(p_user_id uuid, p_reason text default '', p_hide_builds boolean default true, p_ban_email boolean default true)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  hidden uuid[] := '{}';
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user_id = uid then raise exception 'You can''t ban yourself.' using errcode = 'P0001'; end if;
  if exists (select 1 from buildtag.admins a where a.user_id = p_user_id) then
    raise exception 'That account is an admin. Remove admin first.' using errcode = 'P0001';
  end if;
  select lower(u.email) into em from auth.users u where u.id = p_user_id;
  if not found then raise exception 'No such user.' using errcode = 'P0001'; end if;
  if exists (select 1 from buildtag.account_bans b where b.user_id = p_user_id) then return; end if;

  if p_hide_builds then
    with h as (
      update buildtag.vehicles set status = 'disabled' where owner_id = p_user_id and status = 'active' returning id
    ) select coalesce(array_agg(id), '{}') into hidden from h;
  end if;

  insert into buildtag.account_bans (user_id, reason, banned_by_user_id, hidden_vehicle_ids)
  values (p_user_id, left(coalesce(p_reason, ''), 500), uid, hidden);

  if p_ban_email and em is not null then
    insert into buildtag.banned_emails (email, reason, banned_by_user_id, user_id)
    values (em, left(coalesce(p_reason, ''), 500), uid, p_user_id)
    on conflict (email) do nothing;
  end if;

  update auth.users set banned_until = 'infinity' where id = p_user_id;
  -- End their sessions so refresh tokens stop working now.
  begin
    delete from auth.sessions where user_id = p_user_id;
  exception when others then
    null; -- the in-app check (my_account_status) still signs them out
  end;
end;
$$;
revoke execute on function buildtag.admin_ban_user(uuid, text, boolean, boolean) from public;
grant execute on function buildtag.admin_ban_user(uuid, text, boolean, boolean) to authenticated;

create or replace function buildtag.admin_unban_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  b buildtag.account_bans;
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into b from buildtag.account_bans where user_id = p_user_id;
  if not found then return; end if;
  update buildtag.vehicles set status = 'active' where id = any (b.hidden_vehicle_ids) and status = 'disabled';
  delete from buildtag.banned_emails where user_id = p_user_id;
  delete from buildtag.account_bans where user_id = p_user_id;
  update auth.users set banned_until = null where id = p_user_id;
end;
$$;
revoke execute on function buildtag.admin_unban_user(uuid) from public;
grant execute on function buildtag.admin_unban_user(uuid) to authenticated;

create or replace function buildtag.admin_ban_email(p_email text, p_reason text default '')
returns void language plpgsql security definer set search_path = ''
as $$
declare
  em text := lower(trim(coalesce(p_email, '')));
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(em) > 200 then raise exception 'Enter a valid email address.' using errcode = 'P0001'; end if;
  if exists (select 1 from auth.users u join buildtag.admins a on a.user_id = u.id where lower(u.email) = em) then
    raise exception 'That email belongs to an admin.' using errcode = 'P0001';
  end if;
  insert into buildtag.banned_emails (email, reason, banned_by_user_id)
  values (em, left(coalesce(p_reason, ''), 500), auth.uid())
  on conflict (email) do update set reason = excluded.reason;
end;
$$;
revoke execute on function buildtag.admin_ban_email(text, text) from public;
grant execute on function buildtag.admin_ban_email(text, text) to authenticated;

create or replace function buildtag.admin_unban_email(p_email text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from buildtag.banned_emails where email = lower(trim(coalesce(p_email, '')));
end;
$$;
revoke execute on function buildtag.admin_unban_email(text) from public;
grant execute on function buildtag.admin_unban_email(text) to authenticated;

create or replace function buildtag.admin_list_bans()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', b.user_id, 'username', p.username, 'email', u.email, 'reason', b.reason,
                                          'hidden_builds', cardinality(b.hidden_vehicle_ids), 'created_at', b.created_at,
                                          'banned_by', (select bp.username from buildtag.profiles bp where bp.id = b.banned_by_user_id))
                       order by b.created_at desc)
        from buildtag.account_bans b join auth.users u on u.id = b.user_id left join buildtag.profiles p on p.id = b.user_id
    ), '[]'::jsonb),
    'emails', coalesce((
      select jsonb_agg(jsonb_build_object('email', e.email, 'reason', e.reason, 'from_account', e.user_id is not null, 'created_at', e.created_at,
                                          'banned_by', (select bp.username from buildtag.profiles bp where bp.id = e.banned_by_user_id))
                       order by e.created_at desc)
        from buildtag.banned_emails e
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function buildtag.admin_list_bans() from public;
grant execute on function buildtag.admin_list_bans() to authenticated;

notify pgrst, 'reload schema';

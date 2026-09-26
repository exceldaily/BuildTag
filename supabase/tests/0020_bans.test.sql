-- =============================================================================
-- Tests for 0020 (account and email bans). Run inside begin; ... rollback;
-- Same conventions as 0014_org_claims.test.sql.
-- =============================================================================

create schema bt_test;
grant usage on schema bt_test to anon, authenticated;
create table bt_test.results (n serial, test text, ok boolean, detail text);
grant select, insert on bt_test.results to anon, authenticated;
grant usage on sequence bt_test.results_n_seq to anon, authenticated;

create or replace function bt_test.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end $$;
create or replace function bt_test.as_system() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
create or replace function bt_test.check(p_test text, p_ok boolean, p_detail text default '') returns void language sql as $$
  insert into bt_test.results (test, ok, detail) values (p_test, coalesce(p_ok, false), p_detail);
$$;

do $$
declare
  boss uuid := gen_random_uuid();
  spammer uuid := gen_random_uuid();
  other_admin uuid := gen_random_uuid();
  vid uuid; hidden_before uuid; spam_email text; l jsonb;
begin
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 't' || replace(u::text, '-', '') || '@buildtag.test', now(), now(), now()
    from unnest(array[boss, spammer, other_admin]) u;
  insert into buildtag.profiles (id, username)
  select u, 't' || left(replace(u::text, '-', ''), 12) from unnest(array[boss, spammer, other_admin]) u;
  insert into buildtag.admins (user_id) values (boss), (other_admin) on conflict do nothing;
  spam_email := 't' || replace(spammer::text, '-', '') || '@buildtag.test';

  perform bt_test.as_user(spammer);
  insert into buildtag.vehicles (owner_id, make, model) values (spammer, 'Honda', 'Civic') returning id into vid;
  begin
    perform buildtag.admin_ban_user(boss, 'nope');
    perform bt_test.check('non-admin cannot ban', false);
  exception when others then
    perform bt_test.check('non-admin cannot ban', sqlerrm = 'forbidden', sqlerrm);
  end;
  perform bt_test.check('not banned: status says so', not (buildtag.my_account_status() ->> 'banned')::boolean);

  perform bt_test.as_user(boss);
  begin
    perform buildtag.admin_ban_user(boss, 'x');
    perform bt_test.check('cannot ban yourself', false);
  exception when others then
    perform bt_test.check('cannot ban yourself', sqlerrm like '%ban yourself%', sqlerrm);
  end;
  begin
    perform buildtag.admin_ban_user(other_admin, 'x');
    perform bt_test.check('cannot ban another admin', false);
  exception when others then
    perform bt_test.check('cannot ban another admin', sqlerrm like '%Remove admin first%', sqlerrm);
  end;

  perform buildtag.admin_ban_user(spammer, 'Spam builds');
  perform buildtag.admin_ban_user(spammer, 'again');  -- idempotent
  perform bt_test.as_system();
  perform bt_test.check('auth ban set', (select banned_until = 'infinity' from auth.users where id = spammer));
  perform bt_test.check('their builds are hidden', (select status = 'disabled' from buildtag.vehicles where id = vid));
  perform bt_test.check('their email is banned', exists (select 1 from buildtag.banned_emails where email = spam_email and user_id = spammer));
  perform bt_test.as_user(spammer);
  perform bt_test.check('banned user sees banned status', (buildtag.my_account_status() ->> 'banned')::boolean);
  perform bt_test.check('non-admins cannot read bans', (select count(*) = 0 from buildtag.account_bans) and (select count(*) = 0 from buildtag.banned_emails));

  perform bt_test.as_system();
  begin
    insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', upper(spam_email), now(), now());
    perform bt_test.check('banned email cannot sign up again', false);
  exception when others then
    perform bt_test.check('banned email cannot sign up again', sqlerrm like '%can''t be used%', sqlerrm);
  end;
  perform bt_test.check('sign-up form check sees the ban', buildtag.email_is_banned(' ' || upper(spam_email)));

  perform bt_test.as_user(boss);
  l := buildtag.admin_list_bans();
  perform bt_test.check('ban list shows account and email', jsonb_array_length(l -> 'accounts') = 1 and (l -> 'accounts' -> 0 ->> 'hidden_builds')::int = 1 and jsonb_array_length(l -> 'emails') >= 1, l::text);

  perform buildtag.admin_unban_user(spammer);
  perform bt_test.as_system();
  perform bt_test.check('unban clears auth ban', (select banned_until is null from auth.users where id = spammer));
  perform bt_test.check('unban restores hidden builds', (select status = 'active' from buildtag.vehicles where id = vid));
  perform bt_test.check('unban lifts the email ban it added', not exists (select 1 from buildtag.banned_emails where email = spam_email));

  perform bt_test.as_user(boss);
  perform buildtag.admin_ban_email('Troll@Example.com', 'repeat offender');
  perform bt_test.as_system();
  begin
    insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'troll@example.com', now(), now());
    perform bt_test.check('email-only ban blocks sign-up', false);
  exception when others then
    perform bt_test.check('email-only ban blocks sign-up', true, sqlerrm);
  end;
  begin
    update auth.users set email = 'troll@example.com' where id = spammer;
    perform bt_test.check('cannot change email to a banned address', false);
  exception when others then
    perform bt_test.check('cannot change email to a banned address', true, sqlerrm);
  end;
  perform bt_test.as_user(boss);
  begin
    perform buildtag.admin_ban_email(spam_email, '');  -- not an admin email, fine
    perform buildtag.admin_ban_email('t' || replace(other_admin::text, '-', '') || '@buildtag.test', '');
    perform bt_test.check('cannot ban an admin''s email', false);
  exception when others then
    perform bt_test.check('cannot ban an admin''s email', sqlerrm like '%belongs to an admin%', sqlerrm);
  end;
  perform buildtag.admin_unban_email('troll@example.com');
  perform bt_test.check('email unban works', not buildtag.email_is_banned('troll@example.com'));

  perform bt_test.as_system();
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, test, detail from bt_test.results order by n;

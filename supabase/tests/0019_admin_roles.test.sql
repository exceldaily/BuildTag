-- =============================================================================
-- Tests for 0019 (admin role management). Run inside begin; ... rollback;
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
  helper uuid := gen_random_uuid();
  member uuid := gen_random_uuid();
  a jsonb;
begin
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 't' || replace(u::text, '-', '') || '@buildtag.test', now(), now(), now()
    from unnest(array[boss, helper, member]) u;
  insert into buildtag.profiles (id, username)
  select u, 't' || left(replace(u::text, '-', ''), 12) from unnest(array[boss, helper, member]) u;
  delete from buildtag.admins;  -- start from a known state (rolled back)
  insert into buildtag.admins (user_id) values (boss);

  perform bt_test.as_user(member);
  begin
    perform buildtag.admin_set_admin(member, true);
    perform bt_test.check('non-admin cannot make themselves admin', false);
  exception when others then
    perform bt_test.check('non-admin cannot make themselves admin', sqlerrm = 'forbidden', sqlerrm);
  end;
  begin
    perform buildtag.admin_list_admins();
    perform bt_test.check('non-admin cannot list admins', false);
  exception when others then
    perform bt_test.check('non-admin cannot list admins', true, sqlerrm);
  end;

  perform bt_test.as_user(boss);
  begin
    perform buildtag.admin_set_admin(boss, false);
    perform bt_test.check('cannot remove own admin role', false);
  exception when others then
    perform bt_test.check('cannot remove own admin role', sqlerrm like '%your own admin role%', sqlerrm);
  end;

  perform buildtag.admin_set_admin(helper, true);
  perform buildtag.admin_set_admin(helper, true);  -- idempotent
  a := buildtag.admin_list_admins();
  perform bt_test.check('admin can make another user admin', jsonb_array_length(a) = 2, a::text);
  perform bt_test.check('grant records who granted it', (select a2 ->> 'granted_by' from jsonb_array_elements(a) a2 where (a2 ->> 'user_id')::uuid = helper) = 't' || left(replace(boss::text, '-', ''), 12));

  perform bt_test.as_user(helper);
  perform bt_test.check('new admin passes is_admin()', buildtag.is_admin());
  perform buildtag.admin_set_admin(boss, false);
  perform bt_test.check('an admin can remove another admin', not exists (select 1 from buildtag.admins where user_id = boss));

  perform bt_test.as_system();
  delete from buildtag.admins where user_id <> helper;
  perform bt_test.as_user(helper);
  begin
    perform buildtag.admin_set_admin(member, false);  -- not an admin: removing is a no-op, but also never below one admin
    perform bt_test.check('last admin guard holds', (select count(*) from buildtag.admins) = 1);
  exception when others then
    perform bt_test.check('last admin guard holds', sqlerrm like '%at least one admin%', sqlerrm);
  end;

  perform bt_test.as_system();
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, test, detail from bt_test.results order by n;

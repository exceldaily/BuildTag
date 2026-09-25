-- =============================================================================
-- Tests for 0017 (admin-provisioned businesses, invites, business analytics).
-- Run INSIDE a transaction that is rolled back, after 0017 has been applied:
--
--   begin; <this file>; rollback;
--
-- Same conventions as 0014_org_claims.test.sql: throwaway users, results in
-- bt_test.results, final SELECT lists pass/fail.
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
  admin_user uuid := gen_random_uuid();
  shop_owner uuid := gen_random_uuid();
  customer uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  late_signup uuid := gen_random_uuid();
  unconfirmed uuid := gen_random_uuid();
  res jsonb; org uuid; org2 uuid; vid uuid; other_vid uuid; mod_shop uuid; mod_hidden uuid; mod_owner uuid;
  t text; n integer; a jsonb;
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 't' || replace(u::text, '-', '') || '@buildtag.test',
         jsonb_build_object('username', 't' || left(replace(u::text, '-', ''), 12)), now(), now(), now()
    from unnest(array[admin_user, shop_owner, customer, stranger]) u;
  insert into buildtag.profiles (id, username)
  select u, 't' || left(replace(u::text, '-', ''), 12) from unnest(array[admin_user, shop_owner, customer, stranger]) u;
  insert into buildtag.admins (user_id) values (admin_user);

  -- only admins can provision ----------------------------------------------------
  perform bt_test.as_user(stranger);
  begin
    perform buildtag.admin_create_organization('Sneaky Shop', 'custom_shop');
    perform bt_test.check('non-admin cannot create a business as admin', false);
  exception when others then
    perform bt_test.check('non-admin cannot create a business as admin', true, sqlerrm);
  end;
  begin
    perform buildtag.find_user_by_identifier('x@example.com');
    perform bt_test.check('user lookup helper is not callable by clients', false);
  exception when others then
    perform bt_test.check('user lookup helper is not callable by clients', true, sqlerrm);
  end;

  -- admin creates an active business with an existing owner (by username) -------
  perform bt_test.as_user(admin_user);
  res := buildtag.admin_create_organization('Admin Test Motors', 'dealership', 't' || left(replace(shop_owner::text, '-', ''), 12));
  org := (res ->> 'id')::uuid;
  perform bt_test.check('admin-created business returns owner added', res ->> 'owner' = 'added', res::text);
  perform bt_test.check('admin-created business is active by default', (select status = 'active' from buildtag.organizations where id = org));
  perform bt_test.check('named user becomes the owner', exists (select 1 from buildtag.organization_members where organization_id = org and user_id = shop_owner and role = 'owner' and status = 'active'));
  perform bt_test.check('admin is not a member unless asked', not exists (select 1 from buildtag.organization_members where organization_id = org and user_id = admin_user));

  begin
    perform buildtag.admin_create_organization('Typo Shop', 'other', 'no_such_user_zz');
    perform bt_test.check('unknown username is rejected', false);
  exception when others then
    perform bt_test.check('unknown username is rejected', not exists (select 1 from buildtag.organizations where name = 'Typo Shop'), sqlerrm);
  end;

  -- admin adds themself for testing ---------------------------------------------------
  res := buildtag.admin_create_organization('Admin Sandbox', 'other', '', 'active', 'unverified', '{}'::jsonb, 'owner');
  org2 := (res ->> 'id')::uuid;
  perform bt_test.check('admin can add themself as owner', exists (select 1 from buildtag.organization_members where organization_id = org2 and user_id = admin_user and role = 'owner'));
  perform bt_test.check('sandbox shows in admin''s my_organizations', (select count(*) from jsonb_array_elements(buildtag.my_organizations()) e where (e ->> 'id')::uuid = org2) = 1);

  -- invite by email for someone without an account ------------------------------------
  t := buildtag.admin_add_org_member(org, 'New.Hire@Example.com', 'manager');
  perform bt_test.check('unknown email becomes an invite', t = 'invited', t);
  perform bt_test.check('invite email stored lowercase', exists (select 1 from buildtag.organization_invites where organization_id = org and email = 'new.hire@example.com' and accepted_at is null));
  t := buildtag.admin_add_org_member(org, 'new.hire@example.com', 'admin');
  perform bt_test.check('re-inviting updates instead of duplicating', (select count(*) = 1 and min(role::text) = 'admin' from buildtag.organization_invites where organization_id = org and accepted_at is null));

  perform bt_test.as_user(stranger);
  perform bt_test.check('non-admins cannot read invites', (select count(*) = 0 from buildtag.organization_invites));

  -- the invitee signs up (unconfirmed first, then confirmed) ----------------------------
  perform bt_test.as_system();
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', unconfirmed, 'authenticated', 'authenticated', 'new.hire@example.com', null, now(), now());
  perform bt_test.as_user(unconfirmed);
  perform bt_test.check('unconfirmed email does not accept an invite', jsonb_array_length(buildtag.my_organizations()) = 0);
  perform bt_test.as_system();
  delete from auth.users where id = unconfirmed;
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', late_signup, 'authenticated', 'authenticated', 'NEW.HIRE@example.com', now(), now(), now());
  perform bt_test.as_user(late_signup);
  a := buildtag.my_organizations();
  perform bt_test.check('confirmed invitee joins on first dashboard load', (select count(*) = 1 from jsonb_array_elements(a) e where (e ->> 'id')::uuid = org and e ->> 'role' = 'admin'), a::text);
  perform bt_test.as_system();
  perform bt_test.check('invite marked accepted', exists (select 1 from buildtag.organization_invites where organization_id = org and accepted_by_user_id = late_signup and accepted_at is not null));

  -- member management -------------------------------------------------------------------
  perform bt_test.as_user(admin_user);
  perform buildtag.admin_set_org_member(org, late_signup, 'staff');
  perform bt_test.check('admin can change a member role', (select role = 'staff' from buildtag.organization_members where organization_id = org and user_id = late_signup));
  perform buildtag.admin_set_org_member(org, late_signup, null, true);
  perform bt_test.check('admin can remove a member', (select status = 'removed' from buildtag.organization_members where organization_id = org and user_id = late_signup));
  t := buildtag.admin_add_org_member(org, 'someone@example.com', 'staff');
  perform buildtag.admin_revoke_org_invite((select id from buildtag.organization_invites where email = 'someone@example.com'));
  perform bt_test.check('admin can revoke an invite', not exists (select 1 from buildtag.organization_invites where email = 'someone@example.com'));
  a := buildtag.admin_organization_detail(org);
  perform bt_test.check('admin detail lists active members only', jsonb_array_length(a -> 'members') = 1, a::text);

  -- analytics ---------------------------------------------------------------------------
  perform bt_test.as_user(shop_owner);
  vid := buildtag.org_create_vehicle(org, '{"make":"Harley-Davidson","model":"Road Glide","year":"2026"}'::jsonb);
  insert into buildtag.modifications (vehicle_id, category, brand, part_name) values (vid, 'exhaust', 'Vance', 'Slip-ons') returning id into mod_shop;
  insert into buildtag.modifications (vehicle_id, category, brand, part_name) values (vid, 'intake', 'S&S', 'Air cleaner') returning id into mod_hidden;

  perform bt_test.as_system();
  insert into buildtag.vehicles (owner_id, make, model, visibility) values (customer, 'Honda', 'Civic', 'public') returning id into other_vid;
  insert into buildtag.modifications (vehicle_id, category, brand, part_name) values (other_vid, 'wheels', 'Volk', 'TE37') returning id into mod_owner;
  update buildtag.modifications set is_hidden = true where id = mod_hidden;
  insert into buildtag.scan_events (vehicle_id, device_type, country) values (vid, 'mobile', 'US'), (vid, 'mobile', 'US'), (vid, 'desktop', 'CA'), (other_vid, 'mobile', 'US');
  insert into buildtag.scan_events (vehicle_id, device_type, occurred_at) values (vid, 'mobile', now() - interval '60 days');
  insert into buildtag.product_clicks (vehicle_id, modification_id) values (vid, mod_shop), (vid, mod_shop), (vid, mod_hidden), (other_vid, mod_owner);

  perform bt_test.as_user(stranger);
  begin
    perform buildtag.org_analytics(org, 30);
    perform bt_test.check('non-members cannot read business analytics', false);
  exception when others then
    perform bt_test.check('non-members cannot read business analytics', true, sqlerrm);
  end;

  perform bt_test.as_user(shop_owner);
  a := buildtag.org_analytics(org, 30);
  perform bt_test.check('analytics counts scans in the window only', (a ->> 'scans')::int = 3, a::text);
  perform bt_test.check('analytics excludes vehicles the business has no link to', (a ->> 'vehicles')::int = 1, a ->> 'vehicles');
  perform bt_test.check('analytics counts clicks on the business''s parts only', (a ->> 'part_clicks')::int = 2, a ->> 'part_clicks');
  perform bt_test.check('parts the owner hid are left out', (a ->> 'parts')::int = 1 and not (a -> 'top_parts')::text like '%Air cleaner%', a -> 'top_parts' #>> '{}');
  perform bt_test.check('top part carries its clicks', (a -> 'top_parts' -> 0 ->> 'part_name') = 'Slip-ons' and (a -> 'top_parts' -> 0 ->> 'clicks')::int = 2);
  perform bt_test.check('series has one row per day', jsonb_array_length(a -> 'scans_by_day') = 30);
  perform bt_test.check('devices aggregated', (a -> 'devices' ->> 'mobile')::int = 2);
  a := buildtag.org_analytics(org, 90);
  perform bt_test.check('a longer window includes older scans', (a ->> 'scans')::int = 4, a ->> 'scans');
  a := buildtag.org_analytics(org, 100000);
  perform bt_test.check('window is capped at a year', (a ->> 'days')::int = 365);

  perform bt_test.as_user(admin_user);
  perform bt_test.check('admins can read any business''s analytics', (buildtag.org_analytics(org, 30) ->> 'scans')::int = 3);

  perform bt_test.as_system();
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, test, detail from bt_test.results order by n;

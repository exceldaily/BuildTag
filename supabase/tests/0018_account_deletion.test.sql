-- =============================================================================
-- Tests for 0018 (self-service account deletion).
-- Run INSIDE a transaction that is rolled back, after 0018 has been applied:
--
--   begin; <this file>; rollback;
--
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
  shop_owner uuid := gen_random_uuid();
  shop_staff uuid := gen_random_uuid();
  customer uuid := gen_random_uuid();
  solo uuid := gen_random_uuid();
  buyer uuid := gen_random_uuid();
  subscriber uuid := gen_random_uuid();
  org uuid; solo_org uuid; shop_vid uuid; own_vid uuid; shop_mod uuid; paid_order uuid; draft_order uuid;
  claim jsonb; chk jsonb; t text;
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 't' || replace(u::text, '-', '') || '@buildtag.test',
         jsonb_build_object('username', 't' || left(replace(u::text, '-', ''), 12)), now(), now(), now()
    from unnest(array[shop_owner, shop_staff, customer, solo, buyer, subscriber]) u;
  insert into buildtag.profiles (id, username)
  select u, 't' || left(replace(u::text, '-', ''), 12) from unnest(array[shop_owner, shop_staff, customer, solo, buyer, subscriber]) u;

  -- a shop, created by the staff member, owned by shop_owner ---------------------
  perform bt_test.as_user(shop_staff);
  org := (buildtag.create_organization('Deletion Test Garage', 'custom_shop', '{}'::jsonb)).id;
  perform bt_test.as_system();
  update buildtag.organizations set status = 'active' where id = org;
  insert into buildtag.organization_members (organization_id, user_id, role) values (org, shop_owner, 'owner');
  update buildtag.organization_members set role = 'staff' where organization_id = org and user_id = shop_staff;
  insert into buildtag.subscriptions (user_id, plan, status, provider) values (customer, 'pro', 'active', 'comp');  -- room for two vehicles

  -- the staff member builds a customer bike and records a part; the customer claims it
  perform bt_test.as_user(shop_staff);
  shop_vid := buildtag.org_create_vehicle(org, '{"make":"Harley-Davidson","model":"Street Glide","year":"2025"}'::jsonb, array['creator','builder']::buildtag.vehicle_relationship_type[]);
  insert into buildtag.modifications (vehicle_id, category, brand, part_name) values (shop_vid, 'exhaust', 'Vance', 'Pro Pipe') returning id into shop_mod;
  claim := buildtag.generate_vehicle_claim(shop_vid, 60, '');
  perform bt_test.as_user(customer);
  perform buildtag.claim_vehicle(claim ->> 'token');
  insert into buildtag.social_links (owner_type, owner_id, platform, url) values ('vehicle', shop_vid, 'instagram', 'https://instagram.com/mybike');
  insert into buildtag.social_links (owner_type, owner_id, platform, url) values ('profile', customer, 'instagram', 'https://instagram.com/me');
  insert into buildtag.vehicles (owner_id, make, model) values (customer, 'Honda', 'Civic') returning id into own_vid;
  insert into buildtag.modifications (vehicle_id, category, brand, part_name) values (own_vid, 'wheels', 'Volk', 'TE37');

  perform bt_test.as_system();
  insert into buildtag.orders (user_id, status, payment_status) values (customer, 'delivered', 'paid') returning id into paid_order;
  insert into buildtag.orders (user_id, status) values (customer, 'draft') returning id into draft_order;

  -- preview -----------------------------------------------------------------------
  perform bt_test.as_user(customer);
  chk := buildtag.account_deletion_check();
  perform bt_test.check('preview: own vehicle will be deleted', chk -> 'delete_vehicle_ids' @> to_jsonb(array[own_vid]) and jsonb_array_length(chk -> 'delete_vehicle_ids') = 1, chk::text);
  perform bt_test.check('preview: shop-built vehicle goes back to the shop', (chk -> 'returned_vehicles' -> 0 ->> 'organization') = 'Deletion Test Garage');
  perform bt_test.check('preview: nothing blocks this account', jsonb_array_length(chk -> 'sole_owner_of') = 0 and (chk ->> 'orders_in_progress')::int = 0 and not (chk ->> 'active_subscription')::boolean);

  begin
    perform buildtag.delete_my_account('delete');
    perform bt_test.check('wrong confirmation is rejected', false);
  exception when others then
    perform bt_test.check('wrong confirmation is rejected', sqlerrm like '%Type DELETE%', sqlerrm);
  end;

  -- the customer deletes their account -------------------------------------------------
  perform buildtag.delete_my_account('DELETE');
  perform bt_test.as_system();
  perform bt_test.check('auth user is gone', not exists (select 1 from auth.users where id = customer));
  perform bt_test.check('profile is gone', not exists (select 1 from buildtag.profiles where id = customer));
  perform bt_test.check('own vehicle and its parts are gone', not exists (select 1 from buildtag.vehicles where id = own_vid) and not exists (select 1 from buildtag.modifications where vehicle_id = own_vid));
  perform bt_test.check('shop-built vehicle is unclaimed again', (select owner_id is null and ownership_status = 'unclaimed' from buildtag.vehicles where id = shop_vid));
  perform bt_test.check('shop keeps its part and creator role', exists (select 1 from buildtag.modifications where id = shop_mod)
                         and exists (select 1 from buildtag.vehicle_relationships where vehicle_id = shop_vid and organization_id = org and relationship_type = 'creator' and ended_at is null));
  perform bt_test.check('shop-built vehicle keeps its QR code', exists (select 1 from buildtag.qr_codes where vehicle_id = shop_vid and status = 'active'));
  perform bt_test.check('personal social links are gone', not exists (select 1 from buildtag.social_links where owner_id in (customer, shop_vid)));
  perform bt_test.check('paid order kept without the person', (select user_id is null from buildtag.orders where id = paid_order));
  perform bt_test.check('draft order deleted', not exists (select 1 from buildtag.orders where id = draft_order));

  -- a staff member who created the business and recorded parts can leave -------------
  perform bt_test.as_user(shop_staff);
  perform buildtag.delete_my_account('DELETE');
  perform bt_test.as_system();
  perform bt_test.check('staff account deleted', not exists (select 1 from auth.users where id = shop_staff));
  perform bt_test.check('business survives with creator cleared', (select created_by_user_id is null from buildtag.organizations where id = org));
  perform bt_test.check('parts they recorded stay on the build', (select created_by_user_id is null from buildtag.modifications where id = shop_mod));

  -- blockers -----------------------------------------------------------------------------
  perform bt_test.as_user(shop_owner);
  begin
    perform buildtag.delete_my_account('DELETE');
    perform bt_test.check('only owner of a business is blocked', false);
  exception when others then
    perform bt_test.check('only owner of a business is blocked', sqlerrm like '%only owner of Deletion Test Garage%', sqlerrm);
  end;

  perform bt_test.as_system();
  insert into buildtag.orders (user_id, status, payment_status) values (buyer, 'paid', 'paid');
  perform bt_test.as_user(buyer);
  begin
    perform buildtag.delete_my_account('DELETE');
    perform bt_test.check('order in progress blocks deletion', false);
  exception when others then
    perform bt_test.check('order in progress blocks deletion', sqlerrm like '%order in progress%', sqlerrm);
  end;

  perform bt_test.as_system();
  insert into buildtag.subscriptions (user_id, plan, status, provider) values (subscriber, 'pro', 'active', 'stripe');
  perform bt_test.as_user(subscriber);
  begin
    perform buildtag.delete_my_account('DELETE');
    perform bt_test.check('active Stripe subscription blocks deletion', false);
  exception when others then
    perform bt_test.check('active Stripe subscription blocks deletion', sqlerrm like '%Cancel your Pro%', sqlerrm);
  end;
  perform bt_test.as_system();
  update buildtag.subscriptions set provider = 'comp' where user_id = subscriber;
  perform bt_test.as_user(subscriber);
  perform buildtag.delete_my_account('DELETE');
  perform bt_test.as_system();
  perform bt_test.check('complimentary Pro does not block deletion', not exists (select 1 from auth.users where id = subscriber));

  perform bt_test.as_system();
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, test, detail from bt_test.results order by n;

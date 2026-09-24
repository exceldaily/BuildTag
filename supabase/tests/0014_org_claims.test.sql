-- =============================================================================
-- Security tests for 0014 (organizations, claims, provenance).
-- Creates a throwaway schema bt_test. Run INSIDE a transaction that is rolled
-- back, after 0014 has been applied
-- (or appended after the migration text for a dry run):
--
--   begin; <0014 migration if not applied>; <this file>; rollback;
--
-- Every test impersonates a user the way PostgREST does (role authenticated +
-- request.jwt.claims). Results land in bt_test.results; the final SELECT
-- lists every test with pass/fail. Uses throwaway users, no real data.
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
create or replace function bt_test.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
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
  other_owner uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  rider uuid := gen_random_uuid();
  org uuid; org2 uuid; pending_org uuid;
  vid uuid; vid2 uuid; own_vid uuid;
  qr_before text; qr_after text;
  claim jsonb; claim2 jsonb; res jsonb;
  mod_shop uuid; mod_owner uuid; mod_other uuid;
  snap uuid; ord uuid; vslug text; oslug text;
  n integer; t text; ok boolean;
begin
  -- throwaway auth users -----------------------------------------------------
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 't' || replace(u::text, '-', '') || '@buildtag.test',
         jsonb_build_object('username', 't' || left(replace(u::text, '-', ''), 12)), now(), now(), now()
    from unnest(array[shop_owner, shop_staff, customer, other_owner, stranger, rider]) u;
  insert into buildtag.profiles (id, username)
  select u, 't' || left(replace(u::text, '-', ''), 12) from unnest(array[shop_owner, shop_staff, customer, other_owner, stranger, rider]) u;

  -- shop registers (pending), cannot create builds until activated ------------
  perform bt_test.as_user(shop_owner);
  org := (buildtag.create_organization('Blackline Performance Test', 'custom_shop', '{}'::jsonb)).id;
  begin
    perform buildtag.org_create_vehicle(org, '{"make":"Harley-Davidson","model":"Road Glide","year":"2026"}'::jsonb);
    perform bt_test.check('pending business cannot create builds', false);
  exception when others then
    perform bt_test.check('pending business cannot create builds', true, sqlerrm);
  end;
  -- shop owner cannot self-activate
  update buildtag.organizations set status = 'active' where id = org;
  perform bt_test.check('business cannot activate itself', (select status from buildtag.organizations where id = org) = 'pending');

  perform bt_test.as_system();
  update buildtag.organizations set status = 'active' where id = org;  -- operator activation
  perform bt_test.as_user(shop_owner);
  perform buildtag.org_add_member(org, 't' || left(replace(shop_staff::text, '-', ''), 12), 'staff');
  perform buildtag.org_create_crew(org, 'Blackline Riders Test', 'Test crew', 'shop');

  -- shop creates an unclaimed vehicle ----------------------------------------
  perform bt_test.as_user(shop_staff);
  vid := buildtag.org_create_vehicle(org, '{"make":"Harley-Davidson","model":"Road Glide","year":"2026"}'::jsonb,
                                     array['builder', 'dealer']::buildtag.vehicle_relationship_type[], '{"customer_name":"Test Customer"}'::jsonb, true);
  perform bt_test.check('shop creates unclaimed vehicle',
    (select owner_id is null and ownership_status = 'unclaimed' from buildtag.vehicles where id = vid));
  select code into qr_before from buildtag.qr_codes where vehicle_id = vid;
  perform bt_test.check('unclaimed vehicle gets permanent QR', qr_before is not null);
  perform bt_test.check('shop is creator + builder + dealer',
    (select count(*) = 3 from buildtag.vehicle_relationships where vehicle_id = vid and organization_id = org and ended_at is null));
  perform bt_test.check('build associated with shop crew', exists (select 1 from buildtag.crew_builds where vehicle_id = vid));

  -- staff documents parts: provenance comes from the database ------------------
  insert into buildtag.modifications (vehicle_id, category, brand, part_name, source_type, verification_status)
  values (vid, 'exhaust', 'Test', 'Performance Exhaust', 'owner', 'owner_reported') returning id into mod_shop;
  perform bt_test.check('shop mod recorded as shop_recorded (client cannot choose)',
    (select source_type = 'shop' and verification_status = 'shop_recorded' and created_by_organization_id = org and installed_by_organization_id = org
       from buildtag.modifications where id = mod_shop));
  update buildtag.vehicles set nickname = 'DELIVERY' where id = vid;
  get diagnostics n = row_count;
  perform bt_test.check('staff can edit unclaimed vehicle', n = 1);

  -- staff cannot make themselves owner
  begin
    update buildtag.vehicles set owner_id = shop_staff, ownership_status = 'claimed' where id = vid;
    perform bt_test.check('staff cannot set themselves as owner', false);
  exception when others then
    perform bt_test.check('staff cannot set themselves as owner', true, sqlerrm);
  end;

  -- a stranger sees nothing -----------------------------------------------------
  perform bt_test.as_user(stranger);
  perform bt_test.check('stranger cannot read unclaimed vehicle row', (select count(*) = 0 from buildtag.vehicles where id = vid));
  perform bt_test.check('stranger cannot read shop customer record', (select count(*) = 0 from buildtag.vehicle_customer_records where vehicle_id = vid));
  begin
    perform buildtag.generate_vehicle_claim(vid);
    perform bt_test.check('stranger cannot generate a claim', false);
  exception when others then
    perform bt_test.check('stranger cannot generate a claim', true, sqlerrm);
  end;

  -- claim generation -------------------------------------------------------------
  perform bt_test.as_user(shop_staff);
  claim := buildtag.generate_vehicle_claim(vid, 60, '');
  perform bt_test.check('claim returns token + BT code once',
    char_length(claim ->> 'token') >= 40 and (claim ->> 'code') ~ '^BT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$');
  perform bt_test.check('raw token is not stored',
    not exists (select 1 from buildtag.vehicle_claims c where c.token_hash = claim ->> 'token' or c.code_hash = claim ->> 'code'));
  perform bt_test.check('claim log never contains the token',
    not exists (select 1 from buildtag.claim_events e where position(claim ->> 'token' in e.detail) > 0));
  perform bt_test.check('vehicle now claim_pending', (select ownership_status = 'claim_pending' from buildtag.vehicles where id = vid));

  -- anon preview by token only
  perform bt_test.as_anon();
  res := buildtag.claim_preview(claim ->> 'token');
  perform bt_test.check('anon can preview by token', res ->> 'status' = 'active' and res -> 'organization' ->> 'name' = 'Blackline Performance Test');
  perform bt_test.check('preview of garbage token is invalid', buildtag.claim_preview(repeat('x', 43)) ->> 'status' = 'invalid');
  begin
    perform buildtag.claim_vehicle(claim ->> 'token');
    perform bt_test.check('anon cannot claim', false);
  exception when others then
    perform bt_test.check('anon cannot claim', true, sqlerrm);
  end;

  -- the public QR is not a credential
  perform bt_test.as_user(customer);
  res := buildtag.claim_vehicle(null, qr_before);
  perform bt_test.check('public QR code cannot claim', res ->> 'ok' = 'false', res::text);
  res := buildtag.claim_vehicle(repeat('A', 43));
  perform bt_test.check('invalid token fails', res ->> 'error' = 'invalid');

  -- staff of the issuing business cannot take the vehicle
  perform bt_test.as_user(shop_staff);
  res := buildtag.claim_vehicle(claim ->> 'token');
  perform bt_test.check('issuing business staff cannot claim', res ->> 'error' = 'issuer_member');

  -- revoked claim fails, new claim replaces it
  claim2 := buildtag.generate_vehicle_claim(vid, 60, '');
  perform bt_test.as_user(customer);
  res := buildtag.claim_vehicle(claim ->> 'token');
  perform bt_test.check('replaced (revoked) token fails', res ->> 'error' = 'revoked', res::text);

  -- expired claim fails
  perform bt_test.as_system();
  update buildtag.vehicle_claims set expires_at = now() - interval '1 minute' where status = 'active' and vehicle_id = vid;
  perform bt_test.as_user(customer);
  res := buildtag.claim_vehicle(claim2 ->> 'token');
  perform bt_test.check('expired token fails', res ->> 'error' = 'expired', res::text);

  -- manual code claim works (fresh claim)
  perform bt_test.as_user(shop_owner);
  claim := buildtag.generate_vehicle_claim(vid, 60, '');
  perform bt_test.as_user(customer);
  res := buildtag.claim_vehicle(null, lower(replace(claim ->> 'code', '-', ' ')));
  perform bt_test.check('customer claims with manual code', res ->> 'ok' = 'true', res::text);
  perform bt_test.check('customer is now OWNER',
    (select owner_id = customer and ownership_status = 'claimed' from buildtag.vehicles where id = vid)
    and exists (select 1 from buildtag.vehicle_relationships where vehicle_id = vid and relationship_type = 'owner' and user_id = customer and ended_at is null));
  perform bt_test.check('shop remains creator/builder after claim',
    (select count(*) = 3 from buildtag.vehicle_relationships where vehicle_id = vid and organization_id = org and ended_at is null));
  select code into qr_after from buildtag.qr_codes where vehicle_id = vid;
  perform bt_test.check('permanent QR unchanged after claim', qr_after = qr_before);
  res := buildtag.claim_vehicle(claim ->> 'token');
  perform bt_test.check('claimed token cannot be reused', res ->> 'ok' = 'false');

  -- one owner at the database level
  perform bt_test.as_system();
  begin
    insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, user_id) values (vid, 'owner', stranger);
    perform bt_test.check('database allows only one current owner', false);
  exception when unique_violation then
    perform bt_test.check('database allows only one current owner', true);
  end;

  -- provenance after claim -----------------------------------------------------
  perform bt_test.as_user(customer);
  begin
    update buildtag.modifications set part_name = 'My exhaust', installed_by_organization_id = null where id = mod_shop;
    perform bt_test.check('owner cannot rewrite shop record', false);
  exception when others then
    perform bt_test.check('owner cannot rewrite shop record', true, sqlerrm);
  end;
  begin
    update buildtag.modifications set source_type = 'owner', verification_status = 'owner_reported' where id = mod_shop;
  exception when others then null;
  end;
  perform bt_test.check('provenance fields immutable',
    (select source_type = 'shop' and verification_status = 'shop_recorded' and created_by_organization_id = org from buildtag.modifications where id = mod_shop));
  update buildtag.modifications set is_hidden = true where id = mod_shop;
  perform bt_test.check('owner can hide shop record', (select is_hidden from buildtag.modifications where id = mod_shop));
  begin
    delete from buildtag.modifications where id = mod_shop;
    perform bt_test.check('owner cannot delete shop record', false);
  exception when others then
    perform bt_test.check('owner cannot delete shop record', true, sqlerrm);
  end;
  insert into buildtag.modifications (vehicle_id, category, part_name, source_type, verification_status)
  values (vid, 'interior', 'Custom Seat', 'shop', 'shop_recorded') returning id into mod_owner;
  perform bt_test.check('owner mod is owner_reported even if client claims otherwise',
    (select source_type = 'owner' and verification_status = 'owner_reported' and created_by_organization_id is null from buildtag.modifications where id = mod_owner));
  perform bt_test.check('owner cannot see shop private customer record', (select count(*) = 0 from buildtag.vehicle_customer_records where vehicle_id = vid));
  begin
    perform buildtag.org_builds(org);
    perform bt_test.check('owner cannot read shop build list', false);
  exception when others then
    perform bt_test.check('owner cannot read shop build list', true);
  end;
  perform buildtag.join_crew((select id from buildtag.crews where organization_id = org));
  perform bt_test.check('customer can choose to join the shop crew',
    exists (select 1 from buildtag.crew_members m join buildtag.crews c on c.id = m.crew_id where c.organization_id = org and m.user_id = customer));

  -- shop after claim: keeps its records, loses the vehicle -----------------------
  perform bt_test.as_user(shop_staff);
  perform bt_test.check('shop no longer reads the claimed vehicle row', (select count(*) = 0 from buildtag.vehicles where id = vid));
  update buildtag.modifications set description = 'Shop note' where id = mod_shop;
  perform bt_test.check('shop can still correct its own record', (select description = 'Shop note' from buildtag.modifications where id = mod_shop));
  perform bt_test.check('shop cannot see owner-added mod', (select count(*) = 0 from buildtag.modifications where id = mod_owner));
  begin
    insert into buildtag.modifications (vehicle_id, category, part_name, created_by_organization_id) values (vid, 'wheels', 'Wheels', org);
    perform bt_test.check('shop cannot add parts to a claimed vehicle without owner', false);
  exception when others then
    perform bt_test.check('shop cannot add parts to a claimed vehicle without owner', true, sqlerrm);
  end;
  perform bt_test.check('shop still sees the build (claimed) in its list',
    (select (x ->> 'ownership_status') = 'claimed' from jsonb_array_elements(buildtag.org_builds(org)) x where (x ->> 'vehicle_id')::uuid = vid));
  perform bt_test.check('shop cannot see customer profile row', (select count(*) = 0 from buildtag.profiles where id = customer));

  -- a second shop on another unclaimed build --------------------------------------
  perform bt_test.as_user(other_owner);
  org2 := (buildtag.create_organization('Other Shop Test', 'performance_shop', '{}'::jsonb)).id;
  perform bt_test.as_system();
  update buildtag.organizations set status = 'active' where id = org2;
  perform bt_test.as_user(shop_owner);
  vid2 := buildtag.org_create_vehicle(org, '{"make":"Indian","model":"Challenger"}'::jsonb);
  perform bt_test.as_system();
  insert into buildtag.vehicle_relationships (vehicle_id, relationship_type, organization_id) values (vid2, 'installer', org2);
  perform bt_test.as_user(shop_owner);
  insert into buildtag.modifications (vehicle_id, category, part_name) values (vid2, 'engine', 'Stage II') returning id into mod_shop;
  perform bt_test.as_user(other_owner);
  insert into buildtag.modifications (vehicle_id, category, part_name, created_by_organization_id) values (vid2, 'suspension', 'Suspension', org2) returning id into mod_other;
  perform bt_test.check('second shop records its own attributed part',
    (select created_by_organization_id = org2 and installed_by_organization_id = org2 from buildtag.modifications where id = mod_other));
  begin
    update buildtag.modifications set part_name = 'Hijacked' where id = mod_shop;
    get diagnostics n = row_count;
    perform bt_test.check('shop cannot edit another shop''s record', n = 0 or (select part_name from buildtag.modifications where id = mod_shop) <> 'Hijacked');
  exception when others then
    perform bt_test.check('shop cannot edit another shop''s record', true, sqlerrm);
  end;

  -- orders: purchaser stays the business --------------------------------------------
  perform bt_test.as_user(shop_owner);
  insert into buildtag.tag_production_snapshots (user_id, vehicle_id, print_specification_id, configuration_json, width, height, material, qr_destination_at_order, validation_status)
  values (shop_owner, vid2, 'gloss-standard', '{}'::jsonb, 4, 4, 'gloss', 'https://buildtags.app/s/TEST', 'passed') returning id into snap;
  perform bt_test.check('business snapshot tagged with organization', (select organization_id = org from buildtag.tag_production_snapshots where id = snap));
  ord := buildtag.place_order(snap, 2, '{"name":"Blackline"}'::jsonb, true);
  perform bt_test.check('order purchaser is the business', (select organization_id = org and user_id = shop_owner from buildtag.orders where id = ord));
  claim := buildtag.generate_vehicle_claim(vid2);
  perform bt_test.as_user(rider);
  res := buildtag.claim_vehicle(claim ->> 'token');
  perform bt_test.check('rider claims second build', res ->> 'ok' = 'true');
  perform bt_test.check('new owner cannot see the business''s order', (select count(*) = 0 from buildtag.orders where id = ord));
  perform bt_test.as_system();
  perform bt_test.check('order row still owned by business purchaser', (select organization_id = org and user_id = shop_owner from buildtag.orders where id = ord));
  begin
    update buildtag.tag_production_snapshots set width = 5 where id = snap;
    perform bt_test.check('production snapshot stays immutable', false);
  exception when others then
    perform bt_test.check('production snapshot stays immutable', true);
  end;

  -- public read model ------------------------------------------------------------------
  select slug into vslug from buildtag.vehicles where id = vid;
  select slug into oslug from buildtag.organizations where id = org;
  perform bt_test.as_anon();
  res := buildtag.get_public_build(vslug);
  perform bt_test.check('public profile resolves after claim', res ->> 'access' = 'ok');
  perform bt_test.check('public profile shows the builder', exists (
    select 1 from jsonb_array_elements(res -> 'build' -> 'contributors') c where c -> 'organization' ->> 'name' = 'Blackline Performance Test'));
  perform bt_test.check('hidden shop record not public', not exists (
    select 1 from jsonb_array_elements(res -> 'build' -> 'modifications') m where m ->> 'part_name' = 'Performance Exhaust'));
  perform bt_test.check('public build never exposes private customer name', position('Test Customer' in res::text) = 0);
  res := buildtag.get_public_organization(oslug);
  perform bt_test.check('public org page lists builds', jsonb_array_length(res -> 'builds') >= 1);
  perform bt_test.check('public org page hides claim status', position('claim' in (res -> 'builds')::text) = 0 and position('ownership' in (res -> 'builds')::text) = 0);
  begin
    perform count(*) from buildtag.vehicle_claims;
    perform bt_test.check('anon has no table access to claims', false);
  exception when others then
    perform bt_test.check('anon has no table access to claims', true);
  end;

  -- existing-style owner vehicles ---------------------------------------------------
  perform bt_test.as_user(stranger);
  perform buildtag.ensure_profile();
  insert into buildtag.vehicles (owner_id, make, model) values (stranger, 'Toyota', 'Supra') returning id into own_vid;
  perform bt_test.check('owner-created vehicle gets owner + creator relationships',
    (select count(*) = 2 from buildtag.vehicle_relationships where vehicle_id = own_vid and user_id = stranger and ended_at is null)
    and exists (select 1 from buildtag.qr_codes where vehicle_id = own_vid));
  begin
    update buildtag.vehicles set owner_id = null, ownership_status = 'unclaimed' where id = own_vid;
    perform bt_test.check('owner cannot drop ownership outside the claim flow', false);
  exception when others then
    perform bt_test.check('owner cannot drop ownership outside the claim flow', true);
  end;
  begin
    insert into buildtag.vehicles (owner_id, make, model) values (null, 'Ford', 'Bronco');
    perform bt_test.check('users cannot create ownerless vehicles directly', false);
  exception when others then
    perform bt_test.check('users cannot create ownerless vehicles directly', true);
  end;

  -- brute force is rate limited ------------------------------------------------------
  perform bt_test.as_user(rider);
  for n in 1 .. 11 loop
    res := buildtag.claim_vehicle(null, 'BT-ZZZZ-ZZZ' || n % 10);
  end loop;
  perform bt_test.check('claim attempts are rate limited', res ->> 'error' = 'rate_limited', res::text);

  -- business inquiries -----------------------------------------------------------------
  perform bt_test.as_anon();
  perform buildtag.submit_business_inquiry('{"name":"T","business_name":"Test Shop","email":"t@example.com","business_type":"custom_shop","interests":["crews","nope"]}'::jsonb, 'k1');
  perform bt_test.as_user(stranger);
  perform bt_test.check('non-admins cannot read inquiries', (select count(*) = 0 from buildtag.business_inquiries));
  perform bt_test.as_system();
  perform bt_test.check('inquiry saved with only allowed interests', (select interests = array['crews'] from buildtag.business_inquiries where business_name = 'Test Shop'));

  perform bt_test.as_system();
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, test, detail from bt_test.results order by n;

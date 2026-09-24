-- =============================================================================
-- BuildTags Business demo: "Blackline Performance" (FICTIONAL shop) builds a
-- 2026 Road Glide, hands it off with a claim link, a demo customer claims it.
-- =============================================================================
-- Requires migration 0014. Idempotent: re-running rebuilds the demo bike.
-- Blackline Performance, its staff account and the customer are fictional;
-- every URL is a placeholder on example.com. The org stays UNVERIFIED on
-- purpose (verified means we checked a real business).
--
-- Runs the real product code paths by impersonating each demo user the way
-- PostgREST does (request.jwt.claims), so provenance, relationships and the
-- claim are produced by the same functions and triggers the app uses.
-- Photo: public/demo/blackline-1 (stand-in photo, plate blurred; `pnpm images blackline`).
-- =============================================================================

do $$
declare
  shop_user uuid;
  customer uuid;
  org uuid;
  crew_id uuid;
  v_id uuid;
  claim jsonb;
  res jsonb;
  slug_final constant text := 'nightshift-2026-harley-davidson-road-glide';

begin
  -- Demo accounts -------------------------------------------------------------
  select id into shop_user from auth.users where email = 'blackline-staff@buildtag.example';
  if shop_user is null then
    shop_user := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
    values ('00000000-0000-0000-0000-000000000000', shop_user, 'authenticated', 'authenticated', 'blackline-staff@buildtag.example',
            extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"blackline_demo","display_name":"Blackline Demo Staff","app":"buildtag"}'::jsonb,
            now(), now(), '', '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), shop_user, shop_user::text,
            jsonb_build_object('sub', shop_user::text, 'email', 'blackline-staff@buildtag.example', 'email_verified', true), 'email', now(), now(), now());
  end if;
  insert into buildtag.profiles (id, username, display_name, bio)
  values (shop_user, 'blackline_demo', 'Blackline Demo Staff', 'Staff account for the fictional Blackline Performance demo shop.')
  on conflict (id) do update set username = excluded.username, display_name = excluded.display_name, bio = excluded.bio;

  select id into customer from auth.users where email = 'roadglide-customer@buildtag.example';
  if customer is null then
    customer := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
    values ('00000000-0000-0000-0000-000000000000', customer, 'authenticated', 'authenticated', 'roadglide-customer@buildtag.example',
            extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"nightshift_rider","display_name":"Demo Customer","app":"buildtag"}'::jsonb,
            now(), now(), '', '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), customer, customer::text,
            jsonb_build_object('sub', customer::text, 'email', 'roadglide-customer@buildtag.example', 'email_verified', true), 'email', now(), now(), now());
  end if;
  insert into buildtag.profiles (id, username, display_name, bio, location_text)
  values (customer, 'nightshift_rider', 'Demo Customer', 'Fictional customer account for the BuildTags Business demo.', '')
  on conflict (id) do update set username = excluded.username, display_name = excluded.display_name, bio = excluded.bio;

  -- Organization (operator setup: created + activated by BuildTags) --------------
  select id into org from buildtag.organizations where slug = 'blackline-performance';
  if org is null then
    insert into buildtag.organizations (created_by_user_id, name, slug, organization_type, status, verified_status, tagline, description, website_url)
    values (shop_user, 'Blackline Performance', 'blackline-performance', 'performance_shop', 'active', 'unverified',
            'Fictional demo shop. Baggers, tunes and touring builds.',
            'Blackline Performance is a fictional shop used to demonstrate BuildTags Business. It is not a real business, and its builds and customers are demo data.',
            'https://example.com/blackline-performance')
    returning id into org;
  else
    update buildtag.organizations set status = 'active', verified_status = 'unverified' where id = org;
  end if;
  insert into buildtag.organization_members (organization_id, user_id, role) values (org, shop_user, 'owner')
  on conflict (organization_id, user_id) do update set role = 'owner', status = 'active';

  -- Reset the demo bike ------------------------------------------------------------
  delete from buildtag.vehicles where slug = slug_final;

  -- As the shop: crew, build, parts, customer record, claim --------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', shop_user, 'role', 'authenticated')::text, true);

  select id into crew_id from buildtag.crews where organization_id = org;
  if crew_id is null then
    perform buildtag.org_create_crew(org, 'Blackline Performance Riders', 'Every bike that leaves the Blackline bay. Demo crew.', 'shop');
  end if;

  v_id := buildtag.org_create_vehicle(
    org,
    jsonb_build_object(
      'year', 2026, 'make', 'Harley-Davidson', 'model', 'Road Glide', 'nickname', 'NIGHTSHIFT', 'visibility', 'public',
      'description', E'Built at Blackline Performance for a customer who wanted a blacked-out bagger that tours all day and still makes noise at night.\n\nThe shop handled the tune, intake, exhaust, suspension, bags and audio. Everything after delivery is the owner''s.'
    ),
    array['builder', 'installer', 'tuner']::buildtag.vehicle_relationship_type[],
    jsonb_build_object('customer_name', 'Demo Customer', 'customer_email', 'customer@example.com', 'notes', 'Fictional demo customer. Delivered at pickup with claim card.'),
    true
  );

  update buildtag.vehicles
     set slug = slug_final, hero_image_url = '/demo/blackline-1/full.webp', profile_image_url = '/demo/blackline-1/full.webp',
         mileage = 1200, mileage_unit = 'MI', build_started_year = 2026
   where id = v_id;
  update buildtag.qr_codes set code = 'BLK7RGX4' where vehicle_id = v_id;

  insert into buildtag.vehicle_photos (vehicle_id, storage_path, caption, alt_text, width, height, sort_order)
  values (v_id, 'demo/blackline-1', 'Stand-in photo for this fictional demo build', 'Black touring bagger parked on a pier at dusk', 2000, 2334, 0);

  -- shop-recorded parts (the insert trigger stamps provenance from the acting user)
  insert into buildtag.modifications (vehicle_id, category, brand, part_name, description, price, price_public, product_url, installation_date, work_order_reference, sort_order) values
    (v_id, 'ecu_tuning', 'Dynojet', 'Power Vision PV3 + custom dyno tune', 'Tuned on the Blackline dyno after the intake and exhaust went on.', 600, false, 'https://example.com/shop/dynojet-pv3', current_date - 21, 'BLK-DEMO-1042', 0),
    (v_id, 'intake', 'S&S Cycle', 'Stealth Air Cleaner Kit', 'High-flow intake, blacked out to match.', 400, false, 'https://example.com/shop/ss-stealth', current_date - 22, 'BLK-DEMO-1042', 1),
    (v_id, 'exhaust', 'Rinehart Racing', '4 in. Slip-On Mufflers', 'Black with black end caps.', 800, false, 'https://example.com/shop/rinehart-slip-on', current_date - 22, 'BLK-DEMO-1042', 2),
    (v_id, 'suspension', 'Legend Suspensions', 'REVO-A Coil Rear Shocks', 'Set up for one-up touring with loaded bags.', 1200, false, 'https://example.com/shop/legend-revo-a', current_date - 25, 'BLK-DEMO-1042', 3),
    (v_id, 'exterior', '', 'Extended saddlebags, gloss black', 'Longer bags with the rear fender to match.', null, false, null, current_date - 30, 'BLK-DEMO-1042', 4),
    (v_id, 'audio', 'Rockford Fosgate', 'Stage 3 Audio Kit', 'Fairing and lid speakers with a four-channel amp.', 2000, false, 'https://example.com/shop/rockford-stage-3', current_date - 24, 'BLK-DEMO-1042', 5),
    (v_id, 'lighting', 'Custom Dynamics', 'ProBEAM LED Turn Signals', 'Front and rear.', 250, false, 'https://example.com/shop/cd-probeam-signals', current_date - 24, 'BLK-DEMO-1042', 6);

  claim := buildtag.generate_vehicle_claim(v_id, 60, 'customer@example.com');

  -- As the customer: claim, then add their own part -----------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', customer, 'role', 'authenticated')::text, true);
  res := buildtag.claim_vehicle(claim ->> 'token', null);
  if not coalesce((res ->> 'ok')::boolean, false) then
    raise exception 'Demo claim failed: %', res;
  end if;
  select c.id into crew_id from buildtag.crews c where c.organization_id = org;
  perform buildtag.join_crew(crew_id);

  insert into buildtag.modifications (vehicle_id, category, brand, part_name, description, price, price_public, product_url, sort_order)
  values (v_id, 'electronics', 'Cardo', 'PACKTALK Edge Helmet Communicator', 'Paired to the bike audio after delivery.', 390, false, 'https://example.com/shop/cardo-packtalk-edge', 7);

  perform set_config('request.jwt.claims', '', true);
  raise notice 'Blackline demo ready: /build/% (claimed by @nightshift_rider), /org/blackline-performance', slug_final;
end $$;

-- =============================================================================
-- BuildTag demo seed: "GHOST" 2022 Toyota GR Supra
-- =============================================================================
-- Run once against a project that already has migrations 0001-0003 applied
-- (Supabase SQL editor, `psql`, or the Supabase MCP `execute_sql`). Idempotent:
-- re-running replaces the demo vehicle's data.
--
-- The demo owner is a real auth user with a random, unknown password. Social
-- URLs are obvious placeholders; the handle @ghost_supra is not a real account.
-- Images live in the app's /public/demo folder (storage_path prefix "demo/"), fetched by `pnpm images` (Unsplash).
-- =============================================================================

do $$
declare
  demo_user uuid;
  v_id uuid;
  q_id uuid;
  mod_ids uuid[];
  social_ids uuid[];
  i integer;
  d integer;
  n integer;
begin
  -- Owner -------------------------------------------------------------------
  select id into demo_user from auth.users where email = 'demo@buildtag.example';
  if demo_user is null then
    demo_user := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
    ) values (
      '00000000-0000-0000-0000-000000000000', demo_user, 'authenticated', 'authenticated',
      'demo@buildtag.example', extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"buildtag_demo","display_name":"BuildTag Demo","app":"buildtag"}'::jsonb,
      now(), now(), '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), demo_user, demo_user::text,
            jsonb_build_object('sub', demo_user::text, 'email', 'demo@buildtag.example', 'email_verified', true),
            'email', now(), now(), now());
  end if;

  insert into buildtag.profiles (id, username, display_name, bio, location_text, website_url)
  values (demo_user, 'buildtag_demo', 'Brad K.', 'Building a 600+ WHP street Supra one weekend at a time. Dyno days, track days and the occasional oil change.', 'Orlando, FL', 'https://example.com/buildtag-demo')
  on conflict (id) do update set username = excluded.username, display_name = excluded.display_name, bio = excluded.bio, location_text = excluded.location_text, website_url = excluded.website_url;

  -- Owner socials (placeholders) --------------------------------------------
  delete from buildtag.social_links where owner_type = 'profile' and owner_id = demo_user;
  insert into buildtag.social_links (owner_type, owner_id, platform, handle, url, sort_order) values
    ('profile', demo_user, 'instagram', 'brad.builds.demo', 'https://example.com/instagram/brad.builds.demo', 0),
    ('profile', demo_user, 'youtube', 'bradbuildsdemo', 'https://example.com/youtube/bradbuildsdemo', 1);

  -- Vehicle -------------------------------------------------------------------
  delete from buildtag.vehicles where owner_id = demo_user and slug = 'ghost-2022-toyota-gr-supra';

  insert into buildtag.vehicles (
    owner_id, slug, year, make, model, trim, nickname, description,
    hero_image_url, profile_image_url, location_text,
    horsepower, horsepower_type, torque, torque_unit, mileage, mileage_unit,
    build_started_year, build_cost, build_cost_public, dyno_type, visibility, status, show_owner_section
  ) values (
    demo_user, 'ghost-2022-toyota-gr-supra', 2022, 'Toyota', 'GR Supra', '3.0 Premium', 'GHOST',
    E'Daily-driven, track-capable B58 build. The goal was a car that does 600+ to the wheels on pump E30, pulls clean to redline, and still idles like stock in a drive-thru.\n\nPure800 turbo with supporting fuel, cooling and a full bootmod3 custom tune. Suspension is KW V3 on TE37s for weekend track days. Next up: rear seat delete and a proper half cage.',
    '/demo/ghost-1/full.webp', '/demo/ghost-1/full.webp', 'Orlando, FL',
    612, 'WHP', 574, 'LB_FT', 24300, 'MI',
    2022, 26420, true, 'Mustang AWD-500', 'public', 'active', true
  ) returning id into v_id;

  -- Stable, memorable permanent code for the demo decal.
  update buildtag.qr_codes set code = 'GHS7K2P9' where vehicle_id = v_id;
  select id into q_id from buildtag.qr_codes where vehicle_id = v_id;

  -- Photos (served from /public/demo) ---------------------------------------
  insert into buildtag.vehicle_photos (vehicle_id, storage_path, caption, alt_text, width, height, sort_order) values
    (v_id, 'demo/ghost-1', 'Friday night meet, fresh off the Pure800 install', 'White Toyota GR Supra at a night car meet', 2000, 1333, 0),
    (v_id, 'demo/ghost-2', 'Palms and parking lots', 'White GR Supra parked among cars under palm trees at night', 2000, 1333, 1),
    (v_id, 'demo/ghost-3', 'Detail shot after the wrap', 'Close-up of a GR Supra headlight and fender', 2000, 1333, 2);

  -- Vehicle socials (placeholders) ------------------------------------------
  insert into buildtag.social_links (owner_type, owner_id, platform, handle, url, sort_order) values
    ('vehicle', v_id, 'instagram', 'ghost_supra', 'https://example.com/instagram/ghost_supra', 0),
    ('vehicle', v_id, 'tiktok', 'ghost_supra', 'https://example.com/tiktok/ghost_supra', 1),
    ('vehicle', v_id, 'youtube', 'ghostsupra', 'https://example.com/youtube/ghostsupra', 2);

  -- Modifications ------------------------------------------------------------
  insert into buildtag.modifications (vehicle_id, category, brand, part_name, part_number, description, price, price_public, product_url, merchant, installed_by_text, sort_order) values
    (v_id, 'forced_induction', 'Pure Turbos', 'Pure800 Turbo Upgrade', 'PT-B58-800', 'Drop-in upgrade of the stock B58 turbo, rated to 800 HP.', 3995, true, 'https://example.com/shop/pure800-turbo', 'Example Performance', 'Example Performance, Orlando', 0),
    (v_id, 'intake', 'Eventuri', 'Carbon Intake System', 'EVE-B58-CF-INT', '', 1249, true, 'https://example.com/shop/eventuri-b58-intake', 'Example Performance', 'Self', 1),
    (v_id, 'intake', 'CSF', 'Charge-Air Cooler Manifold', 'CSF-8200', 'Billet intake manifold with integrated chargecooler.', 2199, true, 'https://example.com/shop/csf-8200', '', 'Example Performance, Orlando', 2),
    (v_id, 'exhaust', 'Active Autowerke', 'Catted Downpipe', 'AA-B58-DP', 'High-flow 300-cell cat.', 1195, true, 'https://example.com/shop/aa-b58-downpipe', '', 'Example Performance, Orlando', 3),
    (v_id, 'exhaust', 'AWE', 'Touring Edition Exhaust', 'AWE-3015-32014', 'Non-resonated.', 1795, true, 'https://example.com/shop/awe-supra-touring', '', 'Self', 4),
    (v_id, 'fuel_system', 'Fuel-It', 'Stage 2 Low Pressure Fuel Pump', 'FI-S2-LPFP', 'Supports E30 at 600+ WHP.', 899, false, 'https://example.com/shop/fuel-it-lpfp', '', 'Self', 5),
    (v_id, 'fuel_system', 'Fuel-It', 'Bluetooth Flex Fuel Kit', 'FI-BT-FLEX', '', 349, false, null, '', 'Self', 6),
    (v_id, 'cooling', 'CSF', 'High-Performance Radiator', 'CSF-7213', '', 899, true, 'https://example.com/shop/csf-7213', '', 'Self', 7),
    (v_id, 'cooling', 'CSF', 'Heat Exchanger', 'CSF-8195', 'Front-mount chargecooler heat exchanger.', 649, true, 'https://example.com/shop/csf-8195', '', 'Self', 8),
    (v_id, 'ecu_tuning', 'bootmod3', 'Custom E30 Tune', '', 'Custom tune by Example Performance. 24 psi peak.', 1200, true, 'https://example.com/shop/bootmod3', '', 'Example Performance, Orlando', 9),
    (v_id, 'transmission', 'ZF', 'Transmission Cooler Upgrade', '', '', 550, false, null, '', 'Example Performance, Orlando', 10),
    (v_id, 'suspension', 'KW', 'V3 Coilovers', 'KW-352257AL', 'Adjustable rebound and compression.', 2999, true, 'https://example.com/shop/kw-v3-supra', '', 'Self', 11),
    (v_id, 'suspension', 'SPL', 'Rear Toe Arms', 'SPL-RTA-A90', '', 495, true, 'https://example.com/shop/spl-rta-a90', '', 'Self', 12),
    (v_id, 'brakes', 'Girodisc', '2-Piece Front Rotors', 'GD-A1-208', '', 1250, true, 'https://example.com/shop/girodisc-a90', '', 'Self', 13),
    (v_id, 'brakes', 'Ferodo', 'DS2500 Pads', 'FCP4830H', '', 320, true, null, '', 'Self', 14),
    (v_id, 'wheels', 'Volk Racing', 'TE37 SAGA S-plus', '19x9.5 / 19x10.5', 'Pressed Graphite.', 4600, true, 'https://example.com/shop/te37-saga-s-plus', '', 'Self', 15),
    (v_id, 'tires', 'Michelin', 'Pilot Sport 4S', '255/35 + 285/30', '', 1480, true, 'https://example.com/shop/ps4s', '', 'Self', 16),
    (v_id, 'exterior', 'Varis', 'Carbon Front Lip', 'VATO-115', '', 1100, true, 'https://example.com/shop/varis-a90-lip', '', 'Self', 17),
    (v_id, 'exterior', 'Vinyl', 'Satin Ghost Chrome Wrap', '', 'Full wrap.', 3200, false, null, '', 'Example Wraps', 18),
    (v_id, 'aero', 'Voltex', 'GT Wing Type 5', '', '', 2100, true, 'https://example.com/shop/voltex-type5', '', 'Self', 19),
    (v_id, 'interior', 'Recaro', 'Pole Position ABE', '', 'Driver side.', 1700, true, null, '', 'Self', 20),
    (v_id, 'lighting', 'Diode Dynamics', 'SS3 Fog Lights', 'DD6194', '', 380, true, 'https://example.com/shop/dd-ss3', '', 'Self', 21),
    (v_id, 'electronics', 'AiM', 'Solo 2 DL Lap Timer', '', '', 649, true, null, '', 'Self', 22),
    (v_id, 'weight_reduction', 'Custom', 'Rear Seat Delete', '', 'In progress.', null, false, null, '', 'Self', 23);

  select array_agg(id order by sort_order) into mod_ids from buildtag.modifications where vehicle_id = v_id;
  select array_agg(id order by sort_order) into social_ids from buildtag.social_links where owner_type = 'vehicle' and owner_id = v_id;

  -- Analytics: 30 days of scans weighted toward weekends -------------------
  for d in 0 .. 29 loop
    n := 6 + (random() * 14)::integer + case when extract(dow from now() - (d || ' days')::interval) in (0, 6) then 12 else 0 end;
    for i in 1 .. n loop
      insert into buildtag.scan_events (vehicle_id, qr_code_id, occurred_at, referrer, country, device_type)
      values (
        v_id, q_id,
        now() - (d || ' days')::interval - (random() * 86400 || ' seconds')::interval,
        case when random() < 0.15 then 'instagram.com' else null end,
        (array['US','US','US','US','CA','GB','DE','AU','JP'])[1 + (random() * 8)::integer],
        (array['mobile','mobile','mobile','mobile','tablet','desktop'])[1 + (random() * 5)::integer]::buildtag.device_type
      );
    end loop;
  end loop;

  -- Product clicks (turbo, wheels, tune and coilovers get the most)
  for i in 1 .. 240 loop
    insert into buildtag.product_clicks (vehicle_id, modification_id, occurred_at)
    values (
      v_id,
      mod_ids[(array[1,1,1,16,16,10,12,4,2,3,5,17,20])[1 + (random() * 12)::integer]],
      now() - (random() * 30 || ' days')::interval
    );
  end loop;

  -- Social clicks
  for i in 1 .. 180 loop
    insert into buildtag.social_clicks (vehicle_id, social_link_id, occurred_at)
    values (v_id, social_ids[(array[1,1,1,2,3])[1 + (random() * 4)::integer]], now() - (random() * 30 || ' days')::interval);
  end loop;

  -- Likes: 1,284 anonymous visitor keys
  for i in 1 .. 1284 loop
    insert into buildtag.build_likes (vehicle_id, visitor_key, created_at)
    values (v_id, 'demo-' || encode(extensions.gen_random_bytes(16), 'hex'), now() - (random() * 60 || ' days')::interval)
    on conflict do nothing;
  end loop;

  raise notice 'Demo vehicle % seeded for user %', v_id, demo_user;
end $$;

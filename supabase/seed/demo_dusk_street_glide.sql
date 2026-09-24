-- =============================================================================
-- BuildTag demo seed: "DUSK" 2020 Harley-Davidson CVO Street Glide (bagger example)
-- =============================================================================
-- Run after demo_ghost_supra.sql (it reuses the demo owner) and migration 0014. Idempotent:
-- re-running replaces the bike's data. Social, product and affiliate URLs are
-- placeholders on example.com; "Example Customs" is a fictional demo shop.
-- Image lives in /public/demo/dusk-1 (fetched by `pnpm images dusk`).
--
-- Also gives the demo owner a crew ("Example Customs") so build pages show a
-- crew badge and /crew/example-customs demonstrates a shop crew.
-- =============================================================================

do $$
declare
  demo_user uuid;
  v_id uuid;
  q_id uuid;
  shop uuid;
  c_id uuid;
  mod_ids uuid[];
  social_ids uuid[];
  i integer;
  d integer;
  n integer;
begin
  select id into demo_user from auth.users where email = 'demo@buildtag.example';
  if demo_user is null then
    raise exception 'Run demo_ghost_supra.sql first (creates the demo owner).';
  end if;

  -- Demo owner keeps complimentary Pro (third vehicle + crew) ----------------
  insert into buildtag.subscriptions (user_id, plan, status, provider, current_period_end, note)
  values (demo_user, 'pro', 'active', 'comp', null, 'Demo account: example builds')
  on conflict (user_id) do update
    set plan = 'pro', status = 'active', provider = 'comp', current_period_end = null, note = excluded.note, updated_at = now();

  -- Demo shop ---------------------------------------------------------------
  select id into shop from buildtag.organizations where slug = 'example-customs';
  if shop is null then
    insert into buildtag.organizations (created_by_user_id, name, slug, organization_type, status, description, website_url, location_text)
    values (demo_user, 'Example Customs', 'example-customs', 'custom_shop', 'active', 'Fictional demo shop used by the BuildTags example builds.', 'https://example.com/example-customs', 'Tampa, FL')
    returning id into shop;
  end if;

  -- Demo crew ---------------------------------------------------------------
  select id into c_id from buildtag.crews where owner_id = demo_user and organization_id is null;
  if c_id is null then
    delete from buildtag.crew_members where user_id = demo_user;
    insert into buildtag.crews (owner_id, name, slug, tagline)
    values (demo_user, 'Example Customs', 'example-customs', 'Demo shop crew. Every finished build, one scan away.')
    returning id into c_id;
    insert into buildtag.crew_members (crew_id, user_id, role) values (c_id, demo_user, 'owner');
  end if;

  -- Vehicle -------------------------------------------------------------------
  delete from buildtag.vehicles where owner_id = demo_user and slug = 'dusk-2020-harley-davidson-street-glide';

  insert into buildtag.vehicles (
    owner_id, slug, year, make, model, trim, nickname, description,
    hero_image_url, profile_image_url, location_text,
    horsepower, horsepower_type, torque, torque_unit, mileage, mileage_unit,
    build_started_year, build_cost, build_cost_public, dyno_type, visibility, status, show_owner_section
  ) values (
    demo_user, 'dusk-2020-harley-davidson-street-glide', 2020, 'Harley-Davidson', 'Street Glide', 'CVO', 'DUSK',
    E'Bought it to tour, then the shop got involved. The factory 117 got a cam, a tune and a real exhaust, the chassis got proper suspension, and the audio is loud enough to hear at highway speed.\n\nThe engine, suspension and audio work was done at Example Customs; the lighting, pads and comms were weekend jobs in my garage. Next: a 21-inch front and taller bars.',
    '/demo/dusk-1/full.webp', '/demo/dusk-1/full.webp', 'Tampa, FL',
    118, 'WHP', 128, 'LB_FT', 18400, 'MI',
    2021, null, false, 'Dynojet 250i', 'public', 'active', true
  ) returning id into v_id;

  -- Stable permanent code for the demo decal.
  update buildtag.qr_codes set code = 'DSK7GR4X' where vehicle_id = v_id;
  select id into q_id from buildtag.qr_codes where vehicle_id = v_id;

  -- Photo (served from /public/demo) ----------------------------------------
  insert into buildtag.vehicle_photos (vehicle_id, storage_path, caption, alt_text, width, height, sort_order) values
    (v_id, 'demo/dusk-1', 'Last light on the back roads', 'Black and gray CVO Street Glide bagger parked on a road at sunset', 2000, 1321, 0);

  -- Vehicle socials (placeholders) ------------------------------------------
  insert into buildtag.social_links (owner_type, owner_id, platform, handle, url, sort_order) values
    ('vehicle', v_id, 'instagram', 'dusk_glide', 'https://example.com/instagram/dusk_glide', 0),
    ('vehicle', v_id, 'tiktok', 'duskglide', 'https://example.com/tiktok/duskglide', 1),
    ('vehicle', v_id, 'youtube', 'duskglide', 'https://example.com/youtube/duskglide', 2);

  -- Modifications ------------------------------------------------------------
  insert into buildtag.modifications (vehicle_id, category, brand, part_name, part_number, description, price, price_public, product_url, affiliate_url, merchant, affiliate_network, installed_by_text, installed_by_organization_id, installation_date, sort_order) values
    (v_id, 'engine', 'Screamin'' Eagle', 'SE8-517 High-Lift Camshaft', '', 'Pulls harder from 3,000 rpm up without killing the low-end the 117 is known for.', 700, false, 'https://example.com/shop/se8-517-cam', null, '', '', '', shop, '2022-03-12', 0),
    (v_id, 'ecu_tuning', 'Dynojet', 'Power Vision PV3', '', 'Custom dyno tune for the cam and the exhaust.', 600, false, 'https://example.com/shop/dynojet-pv3', 'https://example.com/aff/dynojet-pv3?tag=duskglide-20', 'Example Parts', 'Example affiliate program', '', shop, '2022-03-12', 1),
    (v_id, 'exhaust', 'Rinehart Racing', '4.5 in. Slip-On Mufflers', '', 'Black with black end caps. Loud enough to be heard, not enough to be hated.', 800, false, 'https://example.com/shop/rinehart-slip-on', 'https://example.com/aff/rinehart-slip-on?tag=duskglide-20', 'Example Parts', 'Example affiliate program', '', shop, '2022-03-12', 2),
    (v_id, 'suspension', 'Legend Suspensions', 'REVO-A Coil Rear Shocks', '', 'Adjustable. Set up for two-up touring with the bags loaded.', 1200, false, 'https://example.com/shop/legend-revo-a', 'https://example.com/aff/legend-revo-a?tag=duskglide-20', 'Example Parts', 'Example affiliate program', '', shop, '2022-05-02', 3),
    (v_id, 'suspension', 'Progressive Suspension', 'Monotube Fork Cartridge Kit', '', 'Keeps the front calm under hard braking.', 800, false, 'https://example.com/shop/progressive-monotube', null, '', '', '', shop, '2022-05-02', 4),
    (v_id, 'brakes', 'EBC Brakes', 'Double-H Sintered Brake Pads', '', 'Front and rear. More bite with a passenger on.', 150, false, 'https://example.com/shop/ebc-double-h', null, '', '', 'Self', null, '2022-06-18', 5),
    (v_id, 'tires', 'Dunlop', 'American Elite Tires', '', 'Front and rear.', 450, false, 'https://example.com/shop/dunlop-american-elite', null, '', '', '', shop, '2022-08-19', 6),
    (v_id, 'audio', 'Rockford Fosgate', 'Stage 3 Audio Kit', '', 'Fairing and lid speakers with a four-channel amp.', 2000, false, 'https://example.com/shop/rockford-stage-3', 'https://example.com/aff/rockford-stage-3?tag=duskglide-20', 'Example Parts', 'Example affiliate program', '', shop, '2023-02-14', 7),
    (v_id, 'lighting', 'Custom Dynamics', 'ProBEAM LED Turn Signals', '', 'Front and rear, smoked lens.', 250, false, 'https://example.com/shop/cd-probeam-signals', null, '', '', 'Self', null, '2021-12-11', 8),
    (v_id, 'electronics', 'Cardo', 'PACKTALK Edge Helmet Communicator', '', 'Paired to the bike audio. Rider-to-passenger intercom on long days.', 390, false, 'https://example.com/shop/cardo-packtalk-edge', null, '', '', 'Self', null, '2021-10-02', 9);

  select array_agg(id order by sort_order) into mod_ids from buildtag.modifications where vehicle_id = v_id;
  select array_agg(id order by sort_order) into social_ids from buildtag.social_links where owner_type = 'vehicle' and owner_id = v_id;

  -- Analytics (sample demo data): 30 days of scans ---------------------------
  for d in 0 .. 29 loop
    n := 4 + (random() * 8)::integer + case when extract(dow from now() - (d || ' days')::interval) in (0, 5, 6) then 7 else 0 end;
    for i in 1 .. n loop
      insert into buildtag.scan_events (vehicle_id, qr_code_id, occurred_at, referrer, country, device_type)
      values (
        v_id, q_id,
        now() - (d || ' days')::interval - (random() * 86400 || ' seconds')::interval,
        case when random() < 0.2 then 'instagram.com' else null end,
        (array['US','US','US','US','US','CA','GB','DE','AU'])[1 + (random() * 8)::integer],
        (array['mobile','mobile','mobile','mobile','tablet','desktop'])[1 + (random() * 5)::integer]::buildtag.device_type
      );
    end loop;
  end loop;

  -- Product clicks (exhaust, motor, wheels, seat and bars lead)
  for i in 1 .. 160 loop
    insert into buildtag.product_clicks (vehicle_id, modification_id, occurred_at)
    values (
      v_id,
      mod_ids[(array[3,3,3,1,1,2,2,4,4,8,8,5,9,7,10])[1 + (random() * 14)::integer]],
      now() - (random() * 30 || ' days')::interval
    );
  end loop;

  -- Social clicks
  for i in 1 .. 110 loop
    insert into buildtag.social_clicks (vehicle_id, social_link_id, occurred_at)
    values (v_id, social_ids[(array[1,1,1,2,2,3])[1 + (random() * 5)::integer]], now() - (random() * 30 || ' days')::interval);
  end loop;

  -- Likes
  for i in 1 .. 356 loop
    insert into buildtag.build_likes (vehicle_id, visitor_key, created_at)
    values (v_id, 'demo-' || encode(extensions.gen_random_bytes(16), 'hex'), now() - (random() * 60 || ' days')::interval)
    on conflict do nothing;
  end loop;

  -- The scan trigger stamps the last inserted event; use the real latest.
  update buildtag.qr_codes q set last_scanned_at = (select max(occurred_at) from buildtag.scan_events e where e.qr_code_id = q.id) where q.id = q_id;

  raise notice 'Demo bagger % seeded for user %', v_id, demo_user;
end $$;

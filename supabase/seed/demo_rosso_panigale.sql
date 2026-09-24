-- =============================================================================
-- BuildTag demo seed: "ROSSO" 2021 Ducati Panigale V2 (the motorcycle example)
-- =============================================================================
-- Run after demo_ghost_supra.sql (it reuses the demo owner). Idempotent:
-- re-running replaces the bike's data. Social URLs are placeholders.
-- Images live in /public/demo/rosso-{1,2,3} (fetched by `pnpm images rosso`).
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
  select id into demo_user from auth.users where email = 'demo@buildtag.example';
  if demo_user is null then
    raise exception 'Run demo_ghost_supra.sql first (creates the demo owner).';
  end if;

  -- The demo owner needs Pro for a second vehicle (complimentary, no expiry) --
  insert into buildtag.subscriptions (user_id, plan, status, provider, current_period_end, note)
  values (demo_user, 'pro', 'active', 'comp', null, 'Demo account: two example builds')
  on conflict (user_id) do update
    set plan = 'pro', status = 'active', provider = 'comp', current_period_end = null, note = excluded.note, updated_at = now();

  -- Vehicle -------------------------------------------------------------------
  delete from buildtag.vehicles where owner_id = demo_user and slug = 'rosso-2021-ducati-panigale-v2';

  insert into buildtag.vehicles (
    owner_id, slug, year, make, model, trim, nickname, description,
    hero_image_url, profile_image_url, location_text,
    horsepower, horsepower_type, torque, torque_unit, mileage, mileage_unit,
    build_started_year, build_cost, build_cost_public, dyno_type, visibility, status, show_owner_section
  ) values (
    demo_user, 'rosso-2021-ducati-panigale-v2', 2021, 'Ducati', 'Panigale V2', '955', 'ROSSO',
    E'Street bike first, track bike on Sundays. The V2 is the sweet spot: enough motor to be scary, light enough to flick.\n\nFull Akrapovic system with the Up-Map, Ohlins front and rear, forged Marchesinis and a 520 conversion with one tooth down up front. Brakes got the Corsa Corta master and Z04 pads after the first track day cooked the stock setup. Next: quick-release bodywork for the race fairings.',
    '/demo/rosso-1/full.webp', '/demo/rosso-1/full.webp', 'Tampa, FL',
    148, 'WHP', 72, 'LB_FT', 6800, 'MI',
    2022, 16634, true, 'Dynojet 250i', 'public', 'active', true
  ) returning id into v_id;

  -- Stable permanent code for the demo decal.
  update buildtag.qr_codes set code = 'RSSV2K7P' where vehicle_id = v_id;
  select id into q_id from buildtag.qr_codes where vehicle_id = v_id;

  -- Photos (served from /public/demo) ---------------------------------------
  insert into buildtag.vehicle_photos (vehicle_id, storage_path, caption, alt_text, width, height, sort_order) values
    (v_id, 'demo/rosso-1', 'Tunnel run, fresh set of Supercorsas', 'Red Ducati Panigale V2 parked inside a lit pedestrian tunnel', 2000, 1281, 0),
    (v_id, 'demo/rosso-2', 'Same tunnel, other end', 'Red Ducati Panigale V2 framed by the mouth of a concrete tunnel', 2000, 1938, 1),
    (v_id, 'demo/rosso-3', 'Tail and the Marchesinis', 'Close-up of the Panigale V2 tail and rear wheel', 2000, 1333, 2);

  -- Vehicle socials (placeholders) ------------------------------------------
  insert into buildtag.social_links (owner_type, owner_id, platform, handle, url, sort_order) values
    ('vehicle', v_id, 'instagram', 'rosso_v2', 'https://example.com/instagram/rosso_v2', 0),
    ('vehicle', v_id, 'youtube', 'rossov2', 'https://example.com/youtube/rossov2', 1);

  -- Modifications ------------------------------------------------------------
  insert into buildtag.modifications (vehicle_id, category, brand, part_name, part_number, description, price, price_public, product_url, merchant, installed_by_text, sort_order) values
    (v_id, 'exhaust', 'Akrapovic', 'Full Titanium Racing System', 'S-D9R5-APLT', 'Full system, titanium headers, carbon end cap. Saves about 12 lb over stock.', 3999, true, 'https://example.com/shop/akrapovic-v2-full', 'Example Moto', 'Example Moto, Tampa', 0),
    (v_id, 'ecu_tuning', 'Ducati Performance', 'Racing Up-Map', '96481221AA', 'Race map that pairs with the full system. Removes the exhaust valve error.', 450, true, 'https://example.com/shop/dp-upmap-v2', 'Example Moto', 'Example Moto, Tampa', 1),
    (v_id, 'intake', 'Sprint Filter', 'P08 F1-85 Air Filter', 'PM160SF1-85', '', 129, true, 'https://example.com/shop/sprint-p08-v2', '', 'Self', 2),
    (v_id, 'suspension', 'Ohlins', 'NIX30 Fork Cartridge Kit', 'FKR 118', 'Replaces the Showa BPF internals. Night and day on the brakes.', 1899, true, 'https://example.com/shop/ohlins-nix30-v2', '', 'Example Moto, Tampa', 3),
    (v_id, 'suspension', 'Ohlins', 'TTX GP Rear Shock', 'DU 469', 'Sprung for 175 lb rider in gear.', 2199, true, 'https://example.com/shop/ohlins-ttx-v2', '', 'Example Moto, Tampa', 4),
    (v_id, 'brakes', 'Brembo', 'RCS19 Corsa Corta Master Cylinder', '110C74010', 'Set to the RACE bite point.', 399, true, 'https://example.com/shop/brembo-rcs19-cc', '', 'Self', 5),
    (v_id, 'brakes', 'Brembo', 'Z04 Race Pads', '107A48639', 'Front. Cold bite is weak, warm bite is unreal.', 240, true, 'https://example.com/shop/brembo-z04', '', 'Self', 6),
    (v_id, 'brakes', 'Spiegler', 'Stainless Brake Lines', '', 'Front and rear, black.', 189, true, 'https://example.com/shop/spiegler-v2', '', 'Self', 7),
    (v_id, 'wheels', 'Marchesini', 'M7RS Genesi Forged Wheels', '3.50 x 17 / 5.50 x 17', 'Matte black. Almost 9 lb lighter than the cast set.', 3600, true, 'https://example.com/shop/marchesini-m7rs-v2', '', 'Example Moto, Tampa', 8),
    (v_id, 'tires', 'Pirelli', 'Diablo Supercorsa SP V3', '120/70 ZR17 + 180/60 ZR17', '', 520, true, 'https://example.com/shop/supercorsa-sp', '', 'Example Moto, Tampa', 9),
    (v_id, 'drivetrain', 'DID', '520 ERV7 Chain and Sprocket Conversion', '-1 / +2', 'Superlite sprockets, 14/45. Shorter gearing for the street.', 380, true, 'https://example.com/shop/did-520-erv7', '', 'Self', 10),
    (v_id, 'exterior', 'Rizoma', 'Stealth Mirrors', 'BSS020B', '', 620, true, 'https://example.com/shop/rizoma-stealth', '', 'Self', 11),
    (v_id, 'exterior', 'Ilmberger', 'Carbon Front Fender', 'KVO.019.PA21G.K', 'Gloss carbon.', 349, true, 'https://example.com/shop/ilmberger-v2-fender', '', 'Self', 12),
    (v_id, 'exterior', 'Ducabike', 'Billet Fuel Cap', 'TSB07', 'Keyless.', 129, true, null, '', 'Self', 13),
    (v_id, 'other', 'CNC Racing', 'Adjustable Rearsets', 'PE380B', 'Reverse shift pattern for the track.', 599, true, 'https://example.com/shop/cnc-rearsets-v2', '', 'Self', 14),
    (v_id, 'cooling', 'Evotech Performance', 'Radiator and Oil Cooler Guards', 'PRN014502', '', 145, true, 'https://example.com/shop/evotech-guards-v2', '', 'Self', 15),
    (v_id, 'lighting', 'Rizoma', 'Club S LED Turn Signals', 'FR120B', 'With the Rizoma tail tidy.', 210, true, 'https://example.com/shop/rizoma-club-s', '', 'Self', 16),
    (v_id, 'electronics', 'Ducati', 'Multimedia System Bluetooth Module', '96680451A', 'Calls and music in the helmet from the dash.', 249, false, null, '', 'Example Moto, Tampa', 17),
    (v_id, 'safety', 'R&G', 'Aero Crash Protectors', 'CP0466BL', 'Frame sliders, plus axle sliders both ends.', 120, true, 'https://example.com/shop/rg-aero-v2', '', 'Self', 18),
    (v_id, 'weight_reduction', 'Antigravity', 'ATX-12 Lithium Battery', 'AG-ATX12-RS', 'With RE-START. About 6 lb saved.', 209, true, 'https://example.com/shop/antigravity-atx12', '', 'Self', 19);

  select array_agg(id order by sort_order) into mod_ids from buildtag.modifications where vehicle_id = v_id;
  select array_agg(id order by sort_order) into social_ids from buildtag.social_links where owner_type = 'vehicle' and owner_id = v_id;

  -- Analytics: 30 days of scans, lighter than the Supra ---------------------
  for d in 0 .. 29 loop
    n := 3 + (random() * 8)::integer + case when extract(dow from now() - (d || ' days')::interval) in (0, 6) then 6 else 0 end;
    for i in 1 .. n loop
      insert into buildtag.scan_events (vehicle_id, qr_code_id, occurred_at, referrer, country, device_type)
      values (
        v_id, q_id,
        now() - (d || ' days')::interval - (random() * 86400 || ' seconds')::interval,
        case when random() < 0.2 then 'instagram.com' else null end,
        (array['US','US','US','US','CA','GB','IT','AU','ES'])[1 + (random() * 8)::integer],
        (array['mobile','mobile','mobile','mobile','tablet','desktop'])[1 + (random() * 5)::integer]::buildtag.device_type
      );
    end loop;
  end loop;

  -- Product clicks (exhaust, wheels, suspension and the tune lead)
  for i in 1 .. 140 loop
    insert into buildtag.product_clicks (vehicle_id, modification_id, occurred_at)
    values (
      v_id,
      mod_ids[(array[1,1,1,9,9,4,5,2,10,6,15,12,11])[1 + (random() * 12)::integer]],
      now() - (random() * 30 || ' days')::interval
    );
  end loop;

  -- Social clicks
  for i in 1 .. 90 loop
    insert into buildtag.social_clicks (vehicle_id, social_link_id, occurred_at)
    values (v_id, social_ids[(array[1,1,1,2])[1 + (random() * 3)::integer]], now() - (random() * 30 || ' days')::interval);
  end loop;

  -- Likes: 412 anonymous visitor keys
  for i in 1 .. 412 loop
    insert into buildtag.build_likes (vehicle_id, visitor_key, created_at)
    values (v_id, 'demo-' || encode(extensions.gen_random_bytes(16), 'hex'), now() - (random() * 60 || ' days')::interval)
    on conflict do nothing;
  end loop;

  raise notice 'Demo bike % seeded for user %', v_id, demo_user;
end $$;

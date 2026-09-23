-- 0006: affiliate links as a first-class feature.
--   * public build payload marks which parts carry an affiliate link
--     (so the page can show the required disclosure)
--   * owner analytics report affiliate clicks and how many parts are monetized

create or replace function buildtag.get_public_build(p_slug text, p_visitor_key text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  p buildtag.profiles;
  caller uuid := auth.uid();
  is_owner boolean := false;
  is_admin boolean := false;
  liked boolean := false;
begin
  select * into v from buildtag.vehicles where slug = lower(p_slug);
  if not found then
    return jsonb_build_object('access', 'not_found');
  end if;

  is_owner := caller is not null and caller = v.owner_id;
  if caller is not null then
    is_admin := exists (select 1 from buildtag.admins a where a.user_id = caller);
  end if;

  if v.status = 'disabled' and not (is_owner or is_admin) then
    return jsonb_build_object('access', 'disabled');
  end if;

  if v.visibility = 'private' and not (is_owner or is_admin) then
    return jsonb_build_object('access', 'private');
  end if;

  select * into p from buildtag.profiles where id = v.owner_id;

  if p_visitor_key is not null then
    liked := exists (select 1 from buildtag.build_likes l where l.vehicle_id = v.id and l.visitor_key = p_visitor_key);
  end if;

  return jsonb_build_object(
    'access', 'ok',
    'is_owner', is_owner,
    'liked', liked,
    'build', jsonb_build_object(
      'slug', v.slug,
      'year', v.year,
      'make', v.make,
      'model', v.model,
      'trim', v.trim,
      'nickname', v.nickname,
      'description', v.description,
      'hero_image_url', v.hero_image_url,
      'profile_image_url', v.profile_image_url,
      'location_text', v.location_text,
      'horsepower', v.horsepower,
      'horsepower_type', v.horsepower_type,
      'torque', v.torque,
      'torque_unit', v.torque_unit,
      'mileage', v.mileage,
      'mileage_unit', v.mileage_unit,
      'build_started_year', v.build_started_year,
      'build_cost', case when v.build_cost_public then v.build_cost else null end,
      'build_cost_public', v.build_cost_public,
      'dyno_type', v.dyno_type,
      'visibility', v.visibility,
      'status', v.status,
      'show_owner_section', v.show_owner_section,
      'mod_count', v.mod_count,
      'like_count', v.like_count,
      'scan_count', v.scan_count,
      'created_at', v.created_at,
      'updated_at', v.updated_at,
      'qr_code', (select q.code from buildtag.qr_codes q where q.vehicle_id = v.id and q.status = 'active' order by q.created_at limit 1),
      'has_affiliate_links', exists (select 1 from buildtag.modifications m where m.vehicle_id = v.id and nullif(m.affiliate_url, '') is not null),
      'photos', coalesce((
        select jsonb_agg(jsonb_build_object(
          'storage_path', ph.storage_path,
          'caption', ph.caption,
          'alt_text', ph.alt_text,
          'width', ph.width,
          'height', ph.height
        ) order by ph.sort_order, ph.created_at)
        from buildtag.vehicle_photos ph where ph.vehicle_id = v.id
      ), '[]'::jsonb),
      'modifications', coalesce((
        select jsonb_agg(jsonb_build_object(
          'public_id', m.public_id,
          'category', m.category,
          'brand', m.brand,
          'part_name', m.part_name,
          'part_number', m.part_number,
          'description', m.description,
          'price', case when m.price_public then m.price else null end,
          'has_link', (nullif(m.affiliate_url, '') is not null or nullif(m.product_url, '') is not null),
          'is_affiliate', (nullif(m.affiliate_url, '') is not null),
          'merchant', m.merchant,
          'installed_by_text', m.installed_by_text,
          'installation_date', m.installation_date,
          'shop', case when s.id is null then null else jsonb_build_object(
            'name', s.name, 'slug', s.slug, 'logo_url', s.logo_url, 'website_url', s.website_url,
            'instagram_handle', s.instagram_handle, 'verified', s.verified, 'location_text', s.location_text
          ) end,
          'part', case when pt.id is null then null else jsonb_build_object(
            'brand', pt.brand, 'name', pt.name, 'slug', pt.slug, 'image_url', pt.image_url
          ) end
        ) order by m.category, m.sort_order, m.created_at)
        from buildtag.modifications m
        left join buildtag.shops s on s.id = m.shop_id
        left join buildtag.parts pt on pt.id = m.part_id
        where m.vehicle_id = v.id
      ), '[]'::jsonb),
      'vehicle_socials', coalesce((
        select jsonb_agg(jsonb_build_object(
          'public_id', sl.public_id, 'platform', sl.platform, 'handle', sl.handle, 'url', sl.url
        ) order by sl.sort_order, sl.created_at)
        from buildtag.social_links sl
        where sl.owner_type = 'vehicle' and sl.owner_id = v.id and sl.is_public
      ), '[]'::jsonb),
      'owner', case when v.show_owner_section then jsonb_build_object(
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'bio', p.bio,
        'location_text', p.location_text,
        'website_url', p.website_url,
        'socials', coalesce((
          select jsonb_agg(jsonb_build_object(
            'public_id', sl.public_id, 'platform', sl.platform, 'handle', sl.handle, 'url', sl.url
          ) order by sl.sort_order, sl.created_at)
          from buildtag.social_links sl
          where sl.owner_type = 'profile' and sl.owner_id = p.id and sl.is_public
        ), '[]'::jsonb)
      ) else jsonb_build_object('username', p.username) end
    )
  );
end;
$$;

create or replace function buildtag.vehicle_analytics(p_vehicle_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v buildtag.vehicles;
  caller uuid := auth.uid();
begin
  select * into v from buildtag.vehicles where id = p_vehicle_id;
  if not found then
    return null;
  end if;
  if caller is null or (v.owner_id <> caller and not exists (select 1 from buildtag.admins a where a.user_id = caller)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_scans', v.scan_count,
    'scans_today', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= date_trunc('day', now())),
    'scans_7d', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= now() - interval '7 days'),
    'scans_30d', (select count(*) from buildtag.scan_events e where e.vehicle_id = v.id and e.occurred_at >= now() - interval '30 days'),
    'likes', v.like_count,
    'product_clicks', v.click_count,
    'social_clicks', (select count(*) from buildtag.social_clicks c where c.vehicle_id = v.id),
    'affiliate_clicks', (
      select count(*) from buildtag.product_clicks pc
      join buildtag.modifications m on m.id = pc.modification_id
      where pc.vehicle_id = v.id and nullif(m.affiliate_url, '') is not null
    ),
    'affiliate_clicks_30d', (
      select count(*) from buildtag.product_clicks pc
      join buildtag.modifications m on m.id = pc.modification_id
      where pc.vehicle_id = v.id and nullif(m.affiliate_url, '') is not null and pc.occurred_at >= now() - interval '30 days'
    ),
    'total_parts', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id),
    'linked_parts', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and (nullif(m.affiliate_url, '') is not null or nullif(m.product_url, '') is not null)),
    'monetized_parts', (select count(*) from buildtag.modifications m where m.vehicle_id = v.id and nullif(m.affiliate_url, '') is not null),
    'scans_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(s.count, 0)) order by d.day)
      from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as d(day)
      left join (
        select occurred_at::date as day, count(*) as count
        from buildtag.scan_events e
        where e.vehicle_id = v.id and e.occurred_at >= (now() - interval '29 days')::date
        group by 1
      ) s on s.day = d.day
    ), '[]'::jsonb),
    'top_parts', coalesce((
      select jsonb_agg(jsonb_build_object('part_name', m.part_name, 'brand', m.brand, 'count', c.count, 'is_affiliate', (nullif(m.affiliate_url, '') is not null)) order by c.count desc)
      from (
        select modification_id, count(*) as count
        from buildtag.product_clicks pc
        where pc.vehicle_id = v.id and pc.modification_id is not null
        group by modification_id
        order by count desc
        limit 8
      ) c
      join buildtag.modifications m on m.id = c.modification_id
    ), '[]'::jsonb),
    'top_socials', coalesce((
      select jsonb_agg(jsonb_build_object('platform', sl.platform, 'handle', sl.handle, 'owner_type', sl.owner_type, 'count', c.count) order by c.count desc)
      from (
        select social_link_id, count(*) as count
        from buildtag.social_clicks sc
        where sc.vehicle_id = v.id and sc.social_link_id is not null
        group by social_link_id
        order by count desc
        limit 8
      ) c
      join buildtag.social_links sl on sl.id = c.social_link_id
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_object_agg(device_type, count)
      from (
        select device_type, count(*) as count
        from buildtag.scan_events e where e.vehicle_id = v.id
        group by device_type
      ) d
    ), '{}'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('country', country, 'count', count) order by count desc)
      from (
        select coalesce(country, '??') as country, count(*) as count
        from buildtag.scan_events e where e.vehicle_id = v.id
        group by 1 order by 2 desc limit 8
      ) c
    ), '[]'::jsonb)
  );
end;
$$;

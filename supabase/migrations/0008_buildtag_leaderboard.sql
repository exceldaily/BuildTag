-- 0008: public scan leaderboard + owner plan lookup for the Pro badge.

-- Top scanned public builds. p_period: 'all' | 'month' | 'week' | 'day'
-- (calendar periods, server time zone). Only public + active vehicles.
create or replace function buildtag.scan_leaderboard(p_period text default 'all', p_limit integer default 25)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz;
  lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
  since := case p_period
    when 'day' then date_trunc('day', now())
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else null
  end;

  if since is null then
    return coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', b.slug, 'year', b.year, 'make', b.make, 'model', b.model, 'trim', b.trim, 'nickname', b.nickname,
        'hero_image_url', b.hero_image_url, 'owner_username', b.owner_username, 'like_count', b.like_count,
        'mod_count', b.mod_count, 'horsepower', b.horsepower, 'horsepower_type', b.horsepower_type,
        'scans', b.scan_count
      ) order by b.scan_count desc, b.like_count desc, b.created_at asc)
      from (
        select * from buildtag.public_builds where scan_count > 0 order by scan_count desc, like_count desc, created_at asc limit lim
      ) b
    ), '[]'::jsonb);
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', b.slug, 'year', b.year, 'make', b.make, 'model', b.model, 'trim', b.trim, 'nickname', b.nickname,
      'hero_image_url', b.hero_image_url, 'owner_username', b.owner_username, 'like_count', b.like_count,
      'mod_count', b.mod_count, 'horsepower', b.horsepower, 'horsepower_type', b.horsepower_type,
      'scans', c.scans
    ) order by c.scans desc, b.like_count desc, b.created_at asc)
    from (
      select e.vehicle_id, count(*) as scans
      from buildtag.scan_events e
      join buildtag.vehicles v on v.id = e.vehicle_id
      where e.occurred_at >= since and v.visibility = 'public' and v.status = 'active'
      group by e.vehicle_id
      order by scans desc
      limit lim
    ) c
    join buildtag.vehicles v on v.id = c.vehicle_id
    join buildtag.public_builds b on b.slug = v.slug
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.scan_leaderboard(text, integer) from public;
grant execute on function buildtag.scan_leaderboard(text, integer) to anon, authenticated;

-- Plan of the owner of a build (for the Pro badge on the public page).
create or replace function buildtag.build_owner_plan(p_slug text)
returns buildtag.plan
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.plan from buildtag.subscriptions s
    join buildtag.vehicles v on v.owner_id = s.user_id
    where v.slug = lower(p_slug) and s.status in ('active', 'trialing')
  ), 'free'::buildtag.plan);
$$;
revoke execute on function buildtag.build_owner_plan(text) from public;
grant execute on function buildtag.build_owner_plan(text) to anon, authenticated;

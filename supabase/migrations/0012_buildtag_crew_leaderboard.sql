-- 0012: crews on the leaderboard + public crews directory.
-- Crew scans = scans of every member's public, active builds.

create or replace function buildtag.crew_leaderboard(p_period text default 'all', p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz;
  lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  since := case p_period
    when 'day' then date_trunc('day', now())
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    else null
  end;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'slug', c.slug, 'tagline', c.tagline, 'created_at', c.created_at,
      'member_count', (select count(*) from buildtag.crew_members m where m.crew_id = c.id),
      'build_count', (select count(*) from buildtag.vehicles v join buildtag.crew_members m on m.user_id = v.owner_id where m.crew_id = c.id and v.visibility = 'public' and v.status = 'active'),
      'hero_image_url', (select v.hero_image_url from buildtag.vehicles v join buildtag.crew_members m on m.user_id = v.owner_id where m.crew_id = c.id and v.visibility = 'public' and v.status = 'active' and v.hero_image_url is not null order by v.scan_count desc limit 1),
      'scans', s.scans
    ) order by s.scans desc, c.created_at asc)
    from (
      select c2.id, case when since is null then
          coalesce((select sum(v.scan_count) from buildtag.vehicles v join buildtag.crew_members m on m.user_id = v.owner_id where m.crew_id = c2.id and v.visibility = 'public' and v.status = 'active'), 0)
        else
          coalesce((select count(*) from buildtag.scan_events e join buildtag.vehicles v on v.id = e.vehicle_id join buildtag.crew_members m on m.user_id = v.owner_id where m.crew_id = c2.id and e.occurred_at >= since and v.visibility = 'public' and v.status = 'active'), 0)
        end as scans
      from buildtag.crews c2
      order by scans desc, c2.created_at asc
      limit lim
    ) s
    join buildtag.crews c on c.id = s.id
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.crew_leaderboard(text, integer) from public;
grant execute on function buildtag.crew_leaderboard(text, integer) to anon, authenticated;

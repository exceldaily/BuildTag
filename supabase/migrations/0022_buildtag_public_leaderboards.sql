-- 0022: public leaderboards.
--
-- One function ranks builds four ways (most scanned, most liked, trending,
-- top builds) over a rolling window, and returns each build's previous rank so
-- the page can show movement. A second function ranks crews.
--
-- Rules, enforced here and nowhere else:
--   * only public, active, claimed builds are ranked (same visibility rule as
--     buildtag.public_builds);
--   * demo accounts (@buildtag.example) are never ranked, so seeded sample
--     activity cannot sit on a public board;
--   * movement is computed from the timestamped scan and like events, so no
--     history table is needed yet. If one is added later, only prev_rank has
--     to read from it.

create or replace function buildtag.is_demo_account(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = p_user and u.email like '%@buildtag.example');
$$;
revoke execute on function buildtag.is_demo_account(uuid) from public, anon, authenticated;

create or replace function buildtag.leaderboard(p_board text default 'scanned', p_period text default 'all', p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  board text := case when p_board in ('scanned', 'liked', 'trending', 'top') then p_board else 'scanned' end;
  period text;
  cur_start timestamptz;
  prev_start timestamptz;
  prev_end timestamptz;
begin
  -- Trending is always the last 7 days against the 7 before.
  period := case when board = 'trending' then 'week' when p_period in ('week', 'month', 'all') then p_period else 'all' end;
  if period = 'week' then
    cur_start := now() - interval '7 days'; prev_start := now() - interval '14 days'; prev_end := cur_start;
  elsif period = 'month' then
    cur_start := now() - interval '30 days'; prev_start := now() - interval '60 days'; prev_end := cur_start;
  else
    -- All time: previous standing is the board as it stood a week ago.
    cur_start := '-infinity'; prev_start := '-infinity'; prev_end := now() - interval '7 days';
  end if;

  return coalesce((
    with eligible as (
      select v.id, v.slug, v.year, v.make, v.model, v.trim, v.nickname, v.hero_image_url, v.owner_id, v.created_at,
             v.mod_count, v.horsepower, v.horsepower_type
      from buildtag.vehicles v
      where v.visibility = 'public' and v.status = 'active'
        and v.owner_id is not null and not buildtag.is_demo_account(v.owner_id)
    ), m as (
      select e.*,
        (select count(*) from buildtag.scan_events s where s.vehicle_id = e.id and s.occurred_at >= cur_start) as scans_cur,
        (select count(*) from buildtag.scan_events s where s.vehicle_id = e.id and s.occurred_at >= prev_start and s.occurred_at < prev_end) as scans_prev,
        (select count(*) from buildtag.build_likes l where l.vehicle_id = e.id and l.created_at >= cur_start) as likes_cur,
        (select count(*) from buildtag.build_likes l where l.vehicle_id = e.id and l.created_at >= prev_start and l.created_at < prev_end) as likes_prev
      from eligible e
    ), scored as (
      select m.*,
        case board when 'scanned' then m.scans_cur when 'liked' then m.likes_cur else m.scans_cur + 2 * m.likes_cur end as score,
        case board when 'scanned' then m.scans_prev when 'liked' then m.likes_prev else m.scans_prev + 2 * m.likes_prev end as prev_score
      from m
    ), ranked as (
      select s.*,
        row_number() over (order by s.score desc, s.scans_cur desc, s.likes_cur desc, s.created_at asc) as rank,
        case when s.prev_score > 0 then row_number() over (partition by (s.prev_score > 0) order by s.prev_score desc, s.created_at asc) end as prev_rank
      from scored s
    )
    select jsonb_agg(jsonb_build_object(
      'rank', r.rank, 'prev_rank', r.prev_rank, 'is_new', r.prev_score = 0,
      'score', r.score, 'scans', r.scans_cur, 'likes', r.likes_cur,
      'slug', r.slug, 'year', r.year, 'make', r.make, 'model', r.model, 'trim', r.trim, 'nickname', r.nickname,
      'hero_image_url', r.hero_image_url, 'mod_count', r.mod_count, 'horsepower', r.horsepower, 'horsepower_type', r.horsepower_type,
      'owner_username', (select p.username from buildtag.profiles p where p.id = r.owner_id),
      'crew', (select jsonb_build_object('name', c.name, 'slug', c.slug)
                 from buildtag.crew_members cm join buildtag.crews c on c.id = cm.crew_id
                where cm.user_id = r.owner_id and c.organization_id is null limit 1)
    ) order by r.rank)
    from ranked r
    where r.score > 0 and r.rank <= lim
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.leaderboard(text, text, integer) from public;
grant execute on function buildtag.leaderboard(text, text, integer) to anon, authenticated;

-- Crews ranked by their members' scans over the same rolling windows.
create or replace function buildtag.leaderboard_crews(p_period text default 'all', p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  period text := case when p_period in ('week', 'month', 'all') then p_period else 'all' end;
  cur_start timestamptz;
  prev_start timestamptz;
  prev_end timestamptz;
begin
  if period = 'week' then
    cur_start := now() - interval '7 days'; prev_start := now() - interval '14 days'; prev_end := cur_start;
  elsif period = 'month' then
    cur_start := now() - interval '30 days'; prev_start := now() - interval '60 days'; prev_end := cur_start;
  else
    cur_start := '-infinity'; prev_start := '-infinity'; prev_end := now() - interval '7 days';
  end if;

  return coalesce((
    with crew_vehicles as (
      select m.crew_id, v.id as vehicle_id, v.hero_image_url, v.scan_count
      from buildtag.vehicles v join buildtag.crew_members m on m.user_id = v.owner_id
      where v.visibility = 'public' and v.status = 'active' and not buildtag.is_demo_account(v.owner_id)
    ), scored as (
      select c.id, c.name, c.slug, c.tagline, c.kind, c.created_at,
        (select count(*) from buildtag.scan_events e join crew_vehicles cv on cv.vehicle_id = e.vehicle_id where cv.crew_id = c.id and e.occurred_at >= cur_start) as score,
        (select count(*) from buildtag.scan_events e join crew_vehicles cv on cv.vehicle_id = e.vehicle_id where cv.crew_id = c.id and e.occurred_at >= prev_start and e.occurred_at < prev_end) as prev_score
      from buildtag.crews c
      where c.owner_id is null or not buildtag.is_demo_account(c.owner_id)
    ), ranked as (
      select s.*,
        row_number() over (order by s.score desc, s.created_at asc) as rank,
        case when s.prev_score > 0 then row_number() over (partition by (s.prev_score > 0) order by s.prev_score desc, s.created_at asc) end as prev_rank
      from scored s
    )
    select jsonb_agg(jsonb_build_object(
      'rank', r.rank, 'prev_rank', r.prev_rank, 'is_new', r.prev_score = 0, 'score', r.score,
      'id', r.id, 'name', r.name, 'slug', r.slug, 'tagline', r.tagline, 'kind', r.kind,
      'member_count', (select count(*) from buildtag.crew_members m where m.crew_id = r.id),
      'build_count', (select count(*) from crew_vehicles cv where cv.crew_id = r.id),
      'hero_image_url', (select cv.hero_image_url from crew_vehicles cv where cv.crew_id = r.id and cv.hero_image_url is not null order by cv.scan_count desc limit 1)
    ) order by r.rank)
    from ranked r
    where r.score > 0 and r.rank <= lim
  ), '[]'::jsonb);
end;
$$;
revoke execute on function buildtag.leaderboard_crews(text, integer) from public;
grant execute on function buildtag.leaderboard_crews(text, integer) to anon, authenticated;

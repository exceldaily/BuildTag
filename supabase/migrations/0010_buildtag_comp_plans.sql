-- 0010: complimentary Pro (admin grants), expiry-aware plan lookup, members list.

alter table buildtag.subscriptions add column if not exists note text not null default '';

-- Plan lookup honours an expiry (comped Pro until a date).
create or replace function buildtag.user_plan(p_user_id uuid)
returns buildtag.plan
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.plan from buildtag.subscriptions s
      where s.user_id = p_user_id and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end > now())),
    'free'::buildtag.plan
  );
$$;

-- Admin: grant (pro, optional expiry) or revoke (free) complimentary Pro.
create or replace function buildtag.admin_set_plan(p_user_id uuid, p_plan buildtag.plan, p_until timestamptz default null, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then raise exception 'No such user.' using errcode = 'P0001'; end if;
  if p_plan = 'pro' then
    insert into buildtag.subscriptions (user_id, plan, status, provider, current_period_end, note)
    values (p_user_id, 'pro', 'active', 'comp', p_until, coalesce(left(p_note, 200), ''))
    on conflict (user_id) do update
      set plan = 'pro', status = 'active', provider = 'comp', current_period_end = excluded.current_period_end,
          provider_subscription_id = null, note = excluded.note, updated_at = now();
  else
    update buildtag.subscriptions
       set plan = 'free', status = 'canceled', provider = case when provider = 'comp' then 'comp' else provider end,
           current_period_end = null, note = coalesce(left(p_note, 200), ''), updated_at = now()
     where user_id = p_user_id;
  end if;
end;
$$;
revoke execute on function buildtag.admin_set_plan(uuid, buildtag.plan, timestamptz, text) from public;
grant execute on function buildtag.admin_set_plan(uuid, buildtag.plan, timestamptz, text) to authenticated;

-- Stripe events never downgrade a complimentary Pro.
create or replace function buildtag.billing_upsert_subscription(
  p_token text, p_user_id uuid, p_plan buildtag.plan, p_status buildtag.subscription_status,
  p_customer_id text, p_subscription_id text, p_period_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing buildtag.subscriptions;
begin
  perform buildtag.billing_check_token(p_token);
  if p_user_id is null then raise exception 'user required'; end if;
  select * into existing from buildtag.subscriptions where user_id = p_user_id;
  if found and existing.provider = 'comp' and existing.plan = 'pro' and existing.status = 'active'
     and (existing.current_period_end is null or existing.current_period_end > now()) and p_plan = 'free' then
    update buildtag.subscriptions set provider_customer_id = coalesce(provider_customer_id, p_customer_id), updated_at = now() where user_id = p_user_id;
    return;
  end if;
  insert into buildtag.subscriptions (user_id, plan, status, provider, provider_customer_id, provider_subscription_id, current_period_end)
  values (p_user_id, p_plan, p_status, 'stripe', p_customer_id, p_subscription_id, p_period_end)
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        provider = 'stripe',
        provider_customer_id = coalesce(excluded.provider_customer_id, buildtag.subscriptions.provider_customer_id),
        provider_subscription_id = coalesce(excluded.provider_subscription_id, buildtag.subscriptions.provider_subscription_id),
        current_period_end = excluded.current_period_end,
        updated_at = now();
end;
$$;

-- Admin: members list with plan info (search by username, name or email).
create or replace function buildtag.admin_list_members(p_query text default '', p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when buildtag.is_admin() then coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'username', p.username, 'display_name', p.display_name, 'email', u.email, 'created_at', p.created_at,
      'vehicle_count', (select count(*) from buildtag.vehicles v where v.owner_id = p.id),
      'plan', buildtag.user_plan(p.id),
      'provider', s.provider, 'status', s.status, 'current_period_end', s.current_period_end, 'note', coalesce(s.note, '')
    ) order by p.created_at desc)
    from (
      select * from buildtag.profiles pr
      where p_query = '' or pr.username ilike '%' || p_query || '%' or pr.display_name ilike '%' || p_query || '%'
         or exists (select 1 from auth.users ux where ux.id = pr.id and ux.email ilike '%' || p_query || '%')
      order by pr.created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200)
    ) p
    join auth.users u on u.id = p.id
    left join buildtag.subscriptions s on s.user_id = p.id
  ), '[]'::jsonb) else null end;
$$;
revoke execute on function buildtag.admin_list_members(text, integer) from public;
grant execute on function buildtag.admin_list_members(text, integer) to authenticated;

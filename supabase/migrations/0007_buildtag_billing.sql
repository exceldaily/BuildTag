-- 0007: billing plumbing for Stripe.
--
-- The app never holds a service-role key, so the Stripe webhook (which has
-- no user session) writes through security-definer functions gated by an
-- internal token stored in a table nobody can read through the API.

create table if not exists buildtag.private_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table buildtag.private_settings enable row level security;
revoke all on buildtag.private_settings from anon, authenticated;

create or replace function buildtag.billing_check_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
begin
  select value into expected from buildtag.private_settings where key = 'billing_token';
  if expected is null or p_token is null or p_token <> expected then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function buildtag.billing_check_token(text) from public;

-- Marks a decal order paid after Stripe confirms the Checkout Session.
create or replace function buildtag.billing_mark_order_paid(p_token text, p_order_id uuid, p_reference text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  o buildtag.orders;
begin
  perform buildtag.billing_check_token(p_token);
  select * into o from buildtag.orders where id = p_order_id for update;
  if not found then
    return false;
  end if;
  if o.payment_status = 'paid' then
    return true;
  end if;
  update buildtag.orders
     set payment_status = 'paid',
         payment_provider = 'stripe',
         payment_reference = coalesce(p_reference, payment_reference),
         paid_at = now(),
         status = case when status in ('draft', 'awaiting_payment') then 'paid'::buildtag.order_status else status end
   where id = p_order_id;
  insert into buildtag.order_events (order_id, status, note, actor)
  values (p_order_id, 'paid', 'Payment confirmed by Stripe', 'system');
  return true;
end;
$$;
revoke execute on function buildtag.billing_mark_order_paid(text, uuid, text) from public;
grant execute on function buildtag.billing_mark_order_paid(text, uuid, text) to anon, authenticated;

-- Creates or updates the user's subscription row from a Stripe subscription.
create or replace function buildtag.billing_upsert_subscription(
  p_token text,
  p_user_id uuid,
  p_plan buildtag.plan,
  p_status buildtag.subscription_status,
  p_customer_id text,
  p_subscription_id text,
  p_period_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform buildtag.billing_check_token(p_token);
  if p_user_id is null then
    raise exception 'user required';
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
revoke execute on function buildtag.billing_upsert_subscription(text, uuid, buildtag.plan, buildtag.subscription_status, text, text, timestamptz) from public;
grant execute on function buildtag.billing_upsert_subscription(text, uuid, buildtag.plan, buildtag.subscription_status, text, text, timestamptz) to anon, authenticated;

-- Finds the user behind a Stripe customer (for subscription events without metadata).
create or replace function buildtag.billing_user_for_customer(p_token text, p_customer_id text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  perform buildtag.billing_check_token(p_token);
  select user_id into uid from buildtag.subscriptions where provider_customer_id = p_customer_id limit 1;
  return uid;
end;
$$;
revoke execute on function buildtag.billing_user_for_customer(text, text) from public;
grant execute on function buildtag.billing_user_for_customer(text, text) to anon, authenticated;

-- Lets a signed-in user remember their Stripe customer id before the first
-- webhook lands (so the portal and repeat checkouts reuse one customer).
create or replace function buildtag.billing_remember_customer(p_customer_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into buildtag.subscriptions (user_id, plan, status, provider, provider_customer_id)
  values (uid, 'free', 'incomplete', 'stripe', p_customer_id)
  on conflict (user_id) do update
    set provider = 'stripe',
        provider_customer_id = coalesce(buildtag.subscriptions.provider_customer_id, excluded.provider_customer_id),
        updated_at = now();
end;
$$;
revoke execute on function buildtag.billing_remember_customer(text) from public;
grant execute on function buildtag.billing_remember_customer(text) to authenticated;

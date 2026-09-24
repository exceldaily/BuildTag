-- 0013: production order operations.
--   * sequential human order numbers (BT-000001)
--   * richer order statuses + a proper transition function with timestamps
--   * frozen product fields on order items, notes, carriers, issue reasons
--   * status events carry previous status, actor user and metadata
--   * Stripe event idempotency, notification log
--   * proofs bucket (customer-safe previews); production files stay admin-only
--   * server-recorded QR validation + artwork checksum on snapshots

-- ---------------------------------------------------------------------------
-- Enum values (each in its own statement; must be committed before use)
-- ---------------------------------------------------------------------------
alter type buildtag.order_status add value if not exists 'payment_processing' after 'awaiting_payment';
alter type buildtag.order_status add value if not exists 'needs_review' after 'paid';
alter type buildtag.order_status add value if not exists 'artwork_approved' after 'needs_review';
alter type buildtag.order_status add value if not exists 'artwork_issue' after 'artwork_approved';
alter type buildtag.order_status add value if not exists 'sent_to_maker' after 'artwork_issue';
alter type buildtag.order_status add value if not exists 'refunded' after 'cancelled';
alter type buildtag.payment_status add value if not exists 'processing' after 'pending';

-- ---------------------------------------------------------------------------
-- Order numbers
-- ---------------------------------------------------------------------------
create sequence if not exists buildtag.order_number_seq start 1;
create or replace function buildtag.next_order_number()
returns text language sql volatile set search_path = '' as $$
  select 'BT-' || lpad(nextval('buildtag.order_number_seq')::text, 6, '0');
$$;
alter table buildtag.orders alter column order_number set default buildtag.next_order_number();

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table buildtag.orders
  add column if not exists shipping_company text not null default '',
  add column if not exists shipping_carrier text,
  add column if not exists customer_notes text not null default '',
  add column if not exists admin_notes text not null default '',
  add column if not exists discount_cents integer not null default 0,
  add column if not exists payment_provider_payment_id text,
  add column if not exists proof_approved_at timestamptz,
  add column if not exists artwork_issue_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists sent_to_maker_at timestamptz,
  add column if not exists production_started_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded_at timestamptz;

alter table buildtag.order_items
  add column if not exists product_sku text,
  add column if not exists product_name text,
  add column if not exists width numeric(6,2),
  add column if not exists height numeric(6,2),
  add column if not exists units buildtag.size_unit,
  add column if not exists material text,
  add column if not exists finish text;

alter table buildtag.order_events
  add column if not exists previous_status buildtag.order_status,
  add column if not exists actor_user_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table buildtag.print_specifications
  add column if not exists sku text,
  add column if not exists product_name text not null default 'Exterior BuildTag',
  add column if not exists product_type text not null default 'decal';
update buildtag.print_specifications
   set sku = 'BT-EXT-' || width::int || 'X' || height::int || '-' || upper(material)
 where sku is null;
create unique index if not exists print_specifications_sku_unique on buildtag.print_specifications (sku);

alter table buildtag.tag_production_snapshots
  add column if not exists artwork_sha256 text,
  add column if not exists proof_storage_path text;

-- ---------------------------------------------------------------------------
-- Idempotency + notification log
-- ---------------------------------------------------------------------------
create table if not exists buildtag.payment_events (
  event_id text primary key,
  provider text not null default 'stripe',
  event_type text not null,
  order_id uuid,
  received_at timestamptz not null default now()
);
alter table buildtag.payment_events enable row level security;
revoke all on buildtag.payment_events from anon, authenticated;

create table if not exists buildtag.notification_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references buildtag.orders (id) on delete set null,
  type text not null,
  recipient text not null,
  provider text not null default 'none',
  provider_message_id text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  attempts integer not null default 1,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table buildtag.notification_events enable row level security;
drop policy if exists notification_events_admin_select on buildtag.notification_events;
create policy notification_events_admin_select on buildtag.notification_events for select to authenticated using (buildtag.is_admin());
grant select on buildtag.notification_events to authenticated;

-- Records a payment-provider event once. Returns true when it is new.
create or replace function buildtag.billing_record_event(p_token text, p_event_id text, p_event_type text, p_order_id uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform buildtag.billing_check_token(p_token);
  insert into buildtag.payment_events (event_id, event_type, order_id) values (p_event_id, p_event_type, p_order_id)
  on conflict (event_id) do nothing;
  return found;
end; $$;
revoke execute on function buildtag.billing_record_event(text, text, text, uuid) from public;
grant execute on function buildtag.billing_record_event(text, text, text, uuid) to anon, authenticated;

-- Notification log writer: valid billing token (webhook) or an admin session.
create or replace function buildtag.record_notification(p_token text, p_order_id uuid, p_type text, p_recipient text, p_provider text, p_provider_message_id text, p_status text, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
declare ok boolean := false;
begin
  if p_token is not null then
    begin
      perform buildtag.billing_check_token(p_token); ok := true;
    exception when others then ok := false; end;
  end if;
  if not ok and not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into buildtag.notification_events (order_id, type, recipient, provider, provider_message_id, status, last_error, sent_at)
  values (p_order_id, p_type, coalesce(p_recipient, ''), coalesce(p_provider, 'none'), p_provider_message_id, p_status, p_error, case when p_status = 'sent' then now() else null end);
end; $$;
revoke execute on function buildtag.record_notification(text, uuid, text, text, text, text, text, text) from public;
grant execute on function buildtag.record_notification(text, uuid, text, text, text, text, text, text) to anon, authenticated;

-- Operational flag: automatic manufacturer submission stays off.
insert into buildtag.private_settings (key, value) values ('auto_submit_fulfillment', 'false') on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Payment confirmation (webhook) -> NEEDS REVIEW
-- ---------------------------------------------------------------------------
drop function if exists buildtag.billing_mark_order_paid(text, uuid, text);
create or replace function buildtag.billing_mark_order_paid(p_token text, p_order_id uuid, p_reference text, p_payment_id text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare o buildtag.orders;
begin
  perform buildtag.billing_check_token(p_token);
  select * into o from buildtag.orders where id = p_order_id for update;
  if not found then return false; end if;
  if o.payment_status = 'paid' then return false; end if;  -- already handled: idempotent
  update buildtag.orders
     set payment_status = 'paid', payment_provider = 'stripe',
         payment_reference = coalesce(p_reference, payment_reference),
         payment_provider_payment_id = coalesce(p_payment_id, payment_provider_payment_id),
         paid_at = now(),
         status = case when status in ('draft', 'awaiting_payment', 'payment_processing', 'paid') then 'needs_review'::buildtag.order_status else status end
   where id = p_order_id;
  insert into buildtag.order_events (order_id, previous_status, status, note, actor, metadata)
  values (p_order_id, o.status, 'needs_review', 'Payment confirmed by Stripe', 'payment_provider', jsonb_build_object('session', p_reference, 'payment_intent', p_payment_id));
  return true;
end; $$;
revoke execute on function buildtag.billing_mark_order_paid(text, uuid, text, text) from public;
grant execute on function buildtag.billing_mark_order_paid(text, uuid, text, text) to anon, authenticated;

-- Customer started checkout: mark payment processing (owner only).
create or replace function buildtag.order_mark_payment_processing(p_order_id uuid, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); o buildtag.orders;
begin
  select * into o from buildtag.orders where id = p_order_id and user_id = uid;
  if not found then raise exception 'Order not found.' using errcode = 'P0001'; end if;
  if o.status not in ('awaiting_payment', 'payment_processing') then raise exception 'This order is not awaiting payment.' using errcode = 'P0001'; end if;
  update buildtag.orders set status = 'payment_processing', payment_status = 'processing', payment_provider = 'stripe', payment_reference = p_reference where id = p_order_id;
  if o.status <> 'payment_processing' then
    insert into buildtag.order_events (order_id, previous_status, status, note, actor, actor_user_id) values (p_order_id, o.status, 'payment_processing', 'Checkout started', 'customer', uid);
  end if;
end; $$;
revoke execute on function buildtag.order_mark_payment_processing(uuid, text) from public;
grant execute on function buildtag.order_mark_payment_processing(uuid, text) to authenticated;

-- Email-safe order summary for the webhook (no session).
create or replace function buildtag.billing_order_summary(p_token text, p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare o buildtag.orders; it buildtag.order_items; snap buildtag.tag_production_snapshots; v buildtag.vehicles;
begin
  perform buildtag.billing_check_token(p_token);
  select * into o from buildtag.orders where id = p_order_id;
  if not found then return null; end if;
  select * into it from buildtag.order_items where order_id = o.id order by created_at limit 1;
  if it.production_snapshot_id is not null then
    select * into snap from buildtag.tag_production_snapshots where id = it.production_snapshot_id;
    select * into v from buildtag.vehicles where id = snap.vehicle_id;
  end if;
  return jsonb_build_object(
    'order_id', o.id, 'order_number', o.order_number, 'customer_name', o.shipping_name, 'customer_email', o.customer_email,
    'vehicle', coalesce(nullif(concat_ws(' ', v.year, v.make, v.model), ''), 'Vehicle'),
    'product', coalesce(it.product_name, it.description, 'BuildTag'), 'size', coalesce(it.width::text || ' x ' || it.height::text || ' ' || it.units::text, ''),
    'material', coalesce(it.material, ''), 'finish', coalesce(it.finish, ''), 'quantity', coalesce(it.quantity, 1),
    'total_cents', o.total_cents, 'currency', o.currency, 'payment_status', o.payment_status::text, 'status', o.status::text,
    'qr_status', coalesce(snap.validation_status::text, 'unknown'),
    'tracking_number', o.tracking_number, 'tracking_url', o.tracking_url, 'carrier', o.shipping_carrier
  );
end; $$;
revoke execute on function buildtag.billing_order_summary(text, uuid) from public;
grant execute on function buildtag.billing_order_summary(text, uuid) to anon, authenticated;

-- Same summary for admins (session).
create or replace function buildtag.admin_order_summary(p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare tok text;
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select value into tok from buildtag.private_settings where key = 'billing_token';
  return buildtag.billing_order_summary(tok, p_order_id);
end; $$;
revoke execute on function buildtag.admin_order_summary(uuid) from public;
grant execute on function buildtag.admin_order_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin transitions with guards, timestamps and audit trail
-- ---------------------------------------------------------------------------
drop function if exists buildtag.admin_set_order_status(uuid, buildtag.order_status, text, text, text, text);
create or replace function buildtag.admin_set_order_status(
  p_order_id uuid, p_status buildtag.order_status, p_note text default '',
  p_tracking_number text default null, p_tracking_url text default null, p_provider_order_id text default null,
  p_carrier text default null, p_reason text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare o buildtag.orders; allowed boolean := false; new_status buildtag.order_status := p_status;
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into o from buildtag.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.' using errcode = 'P0001'; end if;
  if o.status in ('cancelled', 'refunded') then raise exception 'This order is closed.' using errcode = 'P0001'; end if;

  -- "paid" from an admin means: payment received outside Stripe -> straight to review
  if p_status = 'paid' then new_status := 'needs_review'; end if;

  allowed := case new_status
    when 'needs_review' then o.status in ('awaiting_payment', 'payment_processing', 'paid', 'artwork_issue', 'preparing_artwork')
    when 'artwork_approved' then o.status in ('paid', 'needs_review', 'artwork_issue', 'preparing_artwork', 'production_error')
    when 'artwork_issue' then o.status in ('paid', 'needs_review', 'artwork_approved', 'preparing_artwork')
    when 'sent_to_maker' then o.status in ('artwork_approved', 'preparing_artwork', 'submitted_to_printer', 'production_error')
    when 'in_production' then o.status in ('artwork_approved', 'sent_to_maker', 'submitted_to_printer', 'production_error')
    when 'shipped' then o.status in ('artwork_approved', 'sent_to_maker', 'submitted_to_printer', 'in_production')
    when 'delivered' then o.status = 'shipped'
    when 'production_error' then o.status in ('artwork_approved', 'sent_to_maker', 'submitted_to_printer', 'in_production')
    when 'cancelled' then o.status <> 'delivered'
    when 'refunded' then o.payment_status = 'paid'
    else false end;
  if not allowed then
    raise exception 'Cannot move an order from % to %.', o.status, new_status using errcode = 'P0001';
  end if;
  if new_status = 'artwork_issue' and coalesce(p_reason, '') = '' then
    raise exception 'Pick a reason for the artwork issue.' using errcode = 'P0001';
  end if;

  update buildtag.orders
     set status = new_status,
         payment_status = case when p_status = 'paid' and payment_status <> 'paid' then 'paid' when new_status = 'refunded' then 'refunded' else payment_status end,
         payment_provider = case when p_status = 'paid' and payment_provider is null then 'manual' else payment_provider end,
         paid_at = case when p_status = 'paid' and paid_at is null then now() else paid_at end,
         fulfillment_status = case new_status
           when 'sent_to_maker' then 'submitted'::buildtag.fulfillment_status
           when 'in_production' then 'in_production'::buildtag.fulfillment_status
           when 'shipped' then 'shipped'::buildtag.fulfillment_status
           when 'delivered' then 'delivered'::buildtag.fulfillment_status
           when 'production_error' then 'error'::buildtag.fulfillment_status
           else fulfillment_status end,
         reviewed_at = case when new_status in ('artwork_approved', 'artwork_issue') and reviewed_at is null then now() else reviewed_at end,
         approved_at = case when new_status = 'artwork_approved' then now() else approved_at end,
         artwork_issue_reason = case when new_status = 'artwork_issue' then p_reason when new_status = 'artwork_approved' then null else artwork_issue_reason end,
         sent_to_maker_at = case when new_status = 'sent_to_maker' and sent_to_maker_at is null then now() else sent_to_maker_at end,
         production_started_at = case when new_status = 'in_production' and production_started_at is null then now() else production_started_at end,
         shipped_at = case when new_status = 'shipped' and shipped_at is null then now() else shipped_at end,
         delivered_at = case when new_status = 'delivered' then now() else delivered_at end,
         cancelled_at = case when new_status = 'cancelled' then now() else cancelled_at end,
         refunded_at = case when new_status = 'refunded' then now() else refunded_at end,
         tracking_number = coalesce(nullif(p_tracking_number, ''), tracking_number),
         tracking_url = coalesce(nullif(p_tracking_url, ''), tracking_url),
         shipping_carrier = coalesce(nullif(p_carrier, ''), shipping_carrier),
         provider_order_id = coalesce(nullif(p_provider_order_id, ''), provider_order_id)
   where id = p_order_id;

  insert into buildtag.order_events (order_id, previous_status, status, note, actor, actor_user_id, metadata)
  values (p_order_id, o.status, new_status, coalesce(p_note, ''), 'admin', auth.uid(),
          jsonb_strip_nulls(jsonb_build_object('reason', p_reason, 'tracking_number', nullif(p_tracking_number, ''), 'tracking_url', nullif(p_tracking_url, ''), 'carrier', nullif(p_carrier, ''), 'provider_order_id', nullif(p_provider_order_id, ''))));
end; $$;
revoke execute on function buildtag.admin_set_order_status(uuid, buildtag.order_status, text, text, text, text, text, text) from public;
grant execute on function buildtag.admin_set_order_status(uuid, buildtag.order_status, text, text, text, text, text, text) to authenticated;

create or replace function buildtag.admin_set_order_notes(p_order_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update buildtag.orders set admin_notes = left(coalesce(p_notes, ''), 4000) where id = p_order_id;
  insert into buildtag.order_events (order_id, previous_status, status, note, actor, actor_user_id, metadata)
  select id, status, status, 'Admin notes updated', 'admin', auth.uid(), '{"kind":"notes"}'::jsonb from buildtag.orders where id = p_order_id;
end; $$;
revoke execute on function buildtag.admin_set_order_notes(uuid, text) from public;
grant execute on function buildtag.admin_set_order_notes(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- place_order: proof approval is required, product facts are frozen
-- ---------------------------------------------------------------------------
drop function if exists buildtag.place_order(uuid, integer, jsonb);
create or replace function buildtag.place_order(p_snapshot_id uuid, p_quantity integer, p_shipping jsonb, p_proof_approved boolean default false)
returns uuid language plpgsql security definer volatile set search_path = '' as $$
declare
  uid uuid := auth.uid(); snap buildtag.tag_production_snapshots; spec buildtag.print_specifications; oid uuid;
  unit integer; subtotal integer; shipping integer := 599;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_quantity < 1 or p_quantity > 500 then raise exception 'invalid quantity' using errcode = '22023'; end if;
  if not coalesce(p_proof_approved, false) then raise exception 'Approve the final proof to continue.' using errcode = 'P0001'; end if;

  select * into snap from buildtag.tag_production_snapshots where id = p_snapshot_id and user_id = uid;
  if not found then raise exception 'snapshot not found' using errcode = 'P0002'; end if;
  if snap.validation_status = 'failed' then raise exception 'artwork failed validation' using errcode = 'P0001'; end if;
  if exists (select 1 from buildtag.order_items oi join buildtag.orders o on o.id = oi.order_id where oi.production_snapshot_id = snap.id and o.status not in ('cancelled')) then
    raise exception 'This proof already has an order. Open it from your orders.' using errcode = 'P0001';
  end if;

  select * into spec from buildtag.print_specifications where id = snap.print_specification_id;
  if not found or not spec.available or spec.provider_sku is null then
    raise exception 'this material is not available for order yet' using errcode = 'P0001';
  end if;

  unit := spec.price_cents;
  if p_quantity >= 10 then unit := (unit * 0.8)::integer; elsif p_quantity >= 3 then unit := (unit * 0.9)::integer; end if;
  subtotal := unit * p_quantity;
  if subtotal >= 5000 then shipping := 0; end if;

  insert into buildtag.orders (
    user_id, status, payment_status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
    shipping_name, shipping_company, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_phone,
    customer_email, customer_notes, fulfillment_provider, proof_approved_at
  ) values (
    uid, 'awaiting_payment', 'unpaid', subtotal, shipping, 0, subtotal + shipping, spec.currency,
    left(coalesce(p_shipping ->> 'name', ''), 120), left(coalesce(p_shipping ->> 'company', ''), 120), left(coalesce(p_shipping ->> 'line1', ''), 200), left(coalesce(p_shipping ->> 'line2', ''), 200),
    left(coalesce(p_shipping ->> 'city', ''), 120), left(coalesce(p_shipping ->> 'state', ''), 80), left(coalesce(p_shipping ->> 'postal_code', ''), 20),
    left(coalesce(p_shipping ->> 'country', 'US'), 2), left(coalesce(p_shipping ->> 'phone', ''), 40),
    left(coalesce(p_shipping ->> 'email', ''), 200), left(coalesce(p_shipping ->> 'notes', ''), 1000), spec.provider, now()
  ) returning id into oid;

  insert into buildtag.order_items (order_id, product_type, production_snapshot_id, print_specification_id, description, quantity, unit_price_cents, total_price_cents,
                                    product_sku, product_name, width, height, units, material, finish)
  values (oid, spec.product_type, snap.id, spec.id, spec.product_name || ' ' || snap.width || 'x' || snap.height || snap.units || ' ' || spec.name, p_quantity, unit, subtotal,
          spec.sku, spec.product_name, snap.width, snap.height, snap.units, snap.material, snap.finish);

  insert into buildtag.order_events (order_id, previous_status, status, note, actor, actor_user_id) values (oid, 'draft', 'awaiting_payment', 'Order placed, proof approved by customer', 'customer', uid);
  return oid;
end; $$;
revoke execute on function buildtag.place_order(uuid, integer, jsonb, boolean) from public;
grant execute on function buildtag.place_order(uuid, integer, jsonb, boolean) to authenticated;

-- Free tags go through review like everything else, with frozen product facts.
create or replace function buildtag.admin_place_comp_order(p_snapshot_id uuid, p_user_id uuid, p_quantity integer, p_shipping jsonb default '{}'::jsonb, p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  snap buildtag.tag_production_snapshots; spec buildtag.print_specifications; oid uuid;
  qty integer := least(greatest(coalesce(p_quantity, 1), 1), 50); recipient_email text;
begin
  if not buildtag.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into snap from buildtag.tag_production_snapshots where id = p_snapshot_id;
  if not found then raise exception 'Snapshot not found.' using errcode = 'P0001'; end if;
  if snap.validation_status = 'failed' then raise exception 'That artwork failed validation.' using errcode = 'P0001'; end if;
  select * into spec from buildtag.print_specifications where id = snap.print_specification_id;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then raise exception 'No such member.' using errcode = 'P0001'; end if;
  select u.email into recipient_email from auth.users u where u.id = p_user_id;
  insert into buildtag.orders (
    user_id, status, payment_status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
    shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_phone,
    customer_email, fulfillment_provider, payment_provider, payment_reference, paid_at, proof_approved_at
  ) values (
    p_user_id, 'needs_review', 'paid', 0, 0, 0, 0, coalesce(spec.currency, 'USD'),
    left(coalesce(p_shipping ->> 'name', ''), 120), left(coalesce(p_shipping ->> 'line1', ''), 200), left(coalesce(p_shipping ->> 'line2', ''), 200),
    left(coalesce(p_shipping ->> 'city', ''), 120), left(coalesce(p_shipping ->> 'state', ''), 80), left(coalesce(p_shipping ->> 'postal_code', ''), 20),
    left(coalesce(nullif(p_shipping ->> 'country', ''), 'US'), 2), left(coalesce(p_shipping ->> 'phone', ''), 40),
    coalesce(recipient_email, ''), coalesce(spec.provider, 'manual'), 'comp', 'free-tag', now(), now()
  ) returning id into oid;
  insert into buildtag.order_items (order_id, product_type, production_snapshot_id, print_specification_id, description, quantity, unit_price_cents, total_price_cents,
                                    product_sku, product_name, width, height, units, material, finish)
  values (oid, coalesce(spec.product_type, 'decal'), snap.id, snap.print_specification_id, coalesce(spec.product_name, 'BuildTag') || ' ' || snap.width || 'x' || snap.height || 'in (free)', qty, 0, 0,
          spec.sku, spec.product_name, snap.width, snap.height, snap.units, snap.material, snap.finish);
  insert into buildtag.order_events (order_id, previous_status, status, note, actor, actor_user_id) values (oid, 'draft', 'needs_review', coalesce(nullif(p_note, ''), 'Free tag from BuildTag'), 'admin', auth.uid());
  return oid;
end; $$;

-- ---------------------------------------------------------------------------
-- Storage: production files are admin-only; proofs are customer-safe previews
-- ---------------------------------------------------------------------------
drop policy if exists buildtag_production_select_recipient on storage.objects;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('buildtag-proofs', 'buildtag-proofs', true, 5242880, array['image/png'])
on conflict (id) do nothing;
drop policy if exists buildtag_proofs_insert on storage.objects;
create policy buildtag_proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'buildtag-proofs' and (split_part(name, '/', 1) = (select auth.uid())::text or buildtag.is_admin()));
drop policy if exists buildtag_proofs_select on storage.objects;
create policy buildtag_proofs_select on storage.objects for select using (bucket_id = 'buildtag-proofs');

-- Customer-side cancel with a server-side guard (unpaid orders only).
create or replace function buildtag.customer_cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); o buildtag.orders;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from buildtag.orders where id = p_order_id and user_id = uid for update;
  if not found then raise exception 'Order not found.' using errcode = 'P0001'; end if;
  if o.status not in ('draft', 'awaiting_payment', 'payment_processing') then raise exception 'Only unpaid orders can be cancelled. Contact us about a paid order.' using errcode = 'P0001'; end if;
  update buildtag.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
  insert into buildtag.order_events (order_id, previous_status, status, note, actor, actor_user_id) values (p_order_id, o.status, 'cancelled', 'Cancelled by customer', 'customer', uid);
end; $$;
revoke execute on function buildtag.customer_cancel_order(uuid) from public;
grant execute on function buildtag.customer_cancel_order(uuid) to authenticated;

-- =============================================================================
-- BuildTag - print specifications, production snapshots, orders
-- =============================================================================
-- Physical BuildTag ordering. The design on screen and the design sent to a
-- printer come from the same configuration: at approval time the app renders
-- the artwork, uploads it, and freezes everything in an immutable
-- tag_production_snapshots row. Orders reference snapshots, never live
-- designs, so later edits to a vehicle or design cannot change ordered
-- artwork.
--
-- Fulfillment is provider-agnostic: orders carry fulfillment_provider +
-- provider_order_id, and print_specifications carry a provider SKU.
-- =============================================================================

create type buildtag.order_status as enum (
  'draft', 'awaiting_payment', 'paid', 'preparing_artwork', 'submitted_to_printer',
  'in_production', 'shipped', 'delivered', 'cancelled', 'production_error'
);
create type buildtag.payment_status as enum ('unpaid', 'pending', 'paid', 'refunded', 'failed');
create type buildtag.fulfillment_status as enum ('not_started', 'queued', 'submitted', 'in_production', 'shipped', 'delivered', 'error');
create type buildtag.validation_status as enum ('passed', 'heuristic_only', 'failed');
create type buildtag.size_unit as enum ('in', 'mm');

-- -----------------------------------------------------------------------------
-- Print specifications: what can physically be ordered, and the geometry the
-- export engine uses (bleed, safe zone, cut path style). Rows without a
-- provider_sku are preview-only and cannot be checked out.
-- -----------------------------------------------------------------------------

create table buildtag.print_specifications (
  id text primary key,                                   -- e.g. 'standard-gloss-4x4'
  name text not null,
  size_id text not null,                                  -- 'small' | 'standard' | 'wide' | 'large'
  width numeric(6, 2) not null,
  height numeric(6, 2) not null,
  units buildtag.size_unit not null default 'in',
  bleed numeric(6, 3) not null default 0.125,             -- same units
  safe_margin numeric(6, 3) not null default 0.125,
  material text not null,                                 -- 'gloss' | 'matte' | 'transparent' | 'reflective' | 'holographic'
  finish text not null default 'standard',
  cut_path_style jsonb not null default '{"layerName":"CutContour","stroke":"#FF00FF","strokeWidth":0.25,"units":"pt"}'::jsonb,
  min_module_mm numeric(5, 3) not null default 0.5,
  price_cents integer not null,
  currency text not null default 'USD',
  provider text,                                          -- fulfillment provider key
  provider_sku text,                                      -- null = preview only
  available boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger print_specifications_set_updated_at
  before update on buildtag.print_specifications
  for each row execute function buildtag.set_updated_at();

-- -----------------------------------------------------------------------------
-- Production snapshots: immutable, one per approved artwork.
-- -----------------------------------------------------------------------------

create table buildtag.tag_production_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tag_design_id uuid references buildtag.tag_designs (id) on delete set null,
  vehicle_id uuid references buildtag.vehicles (id) on delete set null,
  qr_code_id uuid references buildtag.qr_codes (id) on delete set null,
  print_specification_id text references buildtag.print_specifications (id) on delete set null,
  configuration_json jsonb not null,
  width numeric(6, 2) not null,
  height numeric(6, 2) not null,
  units buildtag.size_unit not null default 'in',
  material text not null,
  finish text not null default 'standard',
  quantity integer not null default 1 check (quantity between 1 and 500),
  qr_destination_at_order text not null,                  -- the /s/CODE URL frozen at approval
  svg_storage_path text,
  png_storage_path text,
  validation_status buildtag.validation_status not null,
  validation_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tag_production_snapshots_user_idx on buildtag.tag_production_snapshots (user_id, created_at desc);
create index tag_production_snapshots_vehicle_idx on buildtag.tag_production_snapshots (vehicle_id);

-- Snapshots never change: block updates at the database level.
create or replace function buildtag.snapshots_are_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'production snapshots are immutable' using errcode = 'P0001';
end;
$$;

create trigger tag_production_snapshots_immutable
  before update on buildtag.tag_production_snapshots
  for each row execute function buildtag.snapshots_are_immutable();

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------

create table buildtag.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null default ('BT-' || buildtag.short_code(8)),
  user_id uuid not null references auth.users (id) on delete cascade,
  status buildtag.order_status not null default 'draft',
  payment_status buildtag.payment_status not null default 'unpaid',
  fulfillment_status buildtag.fulfillment_status not null default 'not_started',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'USD',
  shipping_name text not null default '',
  shipping_line1 text not null default '',
  shipping_line2 text not null default '',
  shipping_city text not null default '',
  shipping_state text not null default '',
  shipping_postal_code text not null default '',
  shipping_country text not null default 'US',
  shipping_phone text not null default '',
  customer_email text not null default '',
  payment_provider text,
  payment_reference text,                                 -- e.g. Stripe checkout session / payment intent id
  fulfillment_provider text,
  provider_order_id text,
  tracking_number text,
  tracking_url text,
  notes text not null default '',
  paid_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index orders_number_unique on buildtag.orders (order_number);
create index orders_user_idx on buildtag.orders (user_id, created_at desc);
create index orders_status_idx on buildtag.orders (status, created_at desc);

create trigger orders_set_updated_at
  before update on buildtag.orders
  for each row execute function buildtag.set_updated_at();

create table buildtag.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references buildtag.orders (id) on delete cascade,
  product_type text not null default 'buildtag_decal',
  production_snapshot_id uuid references buildtag.tag_production_snapshots (id) on delete set null,
  print_specification_id text references buildtag.print_specifications (id) on delete set null,
  description text not null default '',
  quantity integer not null check (quantity between 1 and 500),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_price_cents integer not null check (total_price_cents >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on buildtag.order_items (order_id);

-- Order status history for the customer timeline and admin audit.
create table buildtag.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references buildtag.orders (id) on delete cascade,
  status buildtag.order_status not null,
  note text not null default '',
  actor text not null default 'system',                   -- 'customer' | 'admin' | 'provider' | 'system'
  created_at timestamptz not null default now()
);

create index order_events_order_idx on buildtag.order_events (order_id, created_at);

-- -----------------------------------------------------------------------------
-- Storage: production artwork (private, owner + admin read) and owner-uploaded
-- decal assets such as center logos and backgrounds (public read).
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('buildtag-production', 'buildtag-production', false, 26214400, array['image/svg+xml', 'image/png', 'application/pdf']),
  ('buildtag-tag-assets', 'buildtag-tag-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy buildtag_production_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'buildtag-production' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy buildtag_production_select on storage.objects
  for select to authenticated
  using (bucket_id = 'buildtag-production' and (split_part(name, '/', 1) = (select auth.uid())::text or buildtag.is_admin()));

create policy buildtag_tag_assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'buildtag-tag-assets' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy buildtag_tag_assets_update on storage.objects
  for update to authenticated
  using (bucket_id = 'buildtag-tag-assets' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'buildtag-tag-assets' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy buildtag_tag_assets_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'buildtag-tag-assets' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy buildtag_tag_assets_select on storage.objects
  for select to authenticated
  using (bucket_id = 'buildtag-tag-assets' and split_part(name, '/', 1) = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table buildtag.print_specifications      enable row level security;
alter table buildtag.tag_production_snapshots  enable row level security;
alter table buildtag.orders                    enable row level security;
alter table buildtag.order_items               enable row level security;
alter table buildtag.order_events              enable row level security;

grant select                 on buildtag.print_specifications     to anon, authenticated;
grant select, insert         on buildtag.tag_production_snapshots to authenticated;
grant select, insert, update on buildtag.orders                   to authenticated;
grant select, insert         on buildtag.order_items              to authenticated;
grant select, insert         on buildtag.order_events             to authenticated;
grant usage, select on all sequences in schema buildtag to authenticated;

create policy print_specifications_public_read on buildtag.print_specifications
  for select to anon, authenticated using (true);

create policy snapshots_select_own on buildtag.tag_production_snapshots
  for select to authenticated using (user_id = (select auth.uid()) or buildtag.is_admin());
create policy snapshots_insert_own on buildtag.tag_production_snapshots
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy orders_select_own on buildtag.orders
  for select to authenticated using (user_id = (select auth.uid()) or buildtag.is_admin());
create policy orders_insert_own on buildtag.orders
  for insert to authenticated with check (user_id = (select auth.uid()));
-- Customers may only edit their own draft / awaiting-payment orders (address,
-- cancel). Everything after payment is changed through admin/provider paths.
create policy orders_update_own_draft on buildtag.orders
  for update to authenticated
  using (user_id = (select auth.uid()) and status in ('draft', 'awaiting_payment'))
  with check (user_id = (select auth.uid()) and status in ('draft', 'awaiting_payment', 'cancelled'));

create or replace function buildtag.owns_order(p_order_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from buildtag.orders o where o.id = p_order_id and o.user_id = (select auth.uid()));
$$;

revoke execute on function buildtag.owns_order(uuid) from public;
grant execute on function buildtag.owns_order(uuid) to authenticated;

create policy order_items_select on buildtag.order_items
  for select to authenticated using (buildtag.owns_order(order_id) or buildtag.is_admin());
create policy order_items_insert on buildtag.order_items
  for insert to authenticated with check (buildtag.owns_order(order_id));

create policy order_events_select on buildtag.order_events
  for select to authenticated using (buildtag.owns_order(order_id) or buildtag.is_admin());
create policy order_events_insert on buildtag.order_events
  for insert to authenticated with check (buildtag.owns_order(order_id) and actor = 'customer');

-- -----------------------------------------------------------------------------
-- Admin: status transitions (re-checks is_admin), records an event.
-- -----------------------------------------------------------------------------

create or replace function buildtag.admin_set_order_status(
  p_order_id uuid,
  p_status buildtag.order_status,
  p_note text default '',
  p_tracking_number text default null,
  p_tracking_url text default null,
  p_provider_order_id text default null
)
returns void
language plpgsql
security definer
volatile
set search_path = ''
as $$
begin
  if not buildtag.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update buildtag.orders
     set status = p_status,
         payment_status = case when p_status = 'paid' and payment_status <> 'paid' then 'paid' else payment_status end,
         paid_at = case when p_status = 'paid' and paid_at is null then now() else paid_at end,
         fulfillment_status = case p_status
           when 'submitted_to_printer' then 'submitted'::buildtag.fulfillment_status
           when 'in_production' then 'in_production'::buildtag.fulfillment_status
           when 'shipped' then 'shipped'::buildtag.fulfillment_status
           when 'delivered' then 'delivered'::buildtag.fulfillment_status
           when 'production_error' then 'error'::buildtag.fulfillment_status
           else fulfillment_status end,
         shipped_at = case when p_status = 'shipped' and shipped_at is null then now() else shipped_at end,
         tracking_number = coalesce(p_tracking_number, tracking_number),
         tracking_url = coalesce(p_tracking_url, tracking_url),
         provider_order_id = coalesce(p_provider_order_id, provider_order_id)
   where id = p_order_id;
  insert into buildtag.order_events (order_id, status, note, actor) values (p_order_id, p_status, coalesce(p_note, ''), 'admin');
end;
$$;

revoke execute on function buildtag.admin_set_order_status(uuid, buildtag.order_status, text, text, text, text) from public;
grant execute on function buildtag.admin_set_order_status(uuid, buildtag.order_status, text, text, text, text) to authenticated;

-- Customer-side: place an order from a snapshot (single transaction, prices
-- read from print_specifications, never from the client).
create or replace function buildtag.place_order(
  p_snapshot_id uuid,
  p_quantity integer,
  p_shipping jsonb
)
returns uuid
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  snap buildtag.tag_production_snapshots;
  spec buildtag.print_specifications;
  oid uuid;
  unit integer;
  subtotal integer;
  shipping integer := 599;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_quantity < 1 or p_quantity > 500 then raise exception 'invalid quantity' using errcode = '22023'; end if;

  select * into snap from buildtag.tag_production_snapshots where id = p_snapshot_id and user_id = uid;
  if not found then raise exception 'snapshot not found' using errcode = 'P0002'; end if;
  if snap.validation_status = 'failed' then raise exception 'artwork failed validation' using errcode = 'P0001'; end if;

  select * into spec from buildtag.print_specifications where id = snap.print_specification_id;
  if not found or not spec.available or spec.provider_sku is null then
    raise exception 'this material is not available for order yet' using errcode = 'P0001';
  end if;

  unit := spec.price_cents;
  -- simple quantity breaks; real pricing belongs to the provider adapter later
  if p_quantity >= 10 then unit := (unit * 0.8)::integer; elsif p_quantity >= 3 then unit := (unit * 0.9)::integer; end if;
  subtotal := unit * p_quantity;
  if subtotal >= 5000 then shipping := 0; end if;

  insert into buildtag.orders (
    user_id, status, payment_status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
    shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_phone,
    customer_email, fulfillment_provider
  ) values (
    uid, 'awaiting_payment', 'unpaid', subtotal, shipping, 0, subtotal + shipping, spec.currency,
    left(coalesce(p_shipping ->> 'name', ''), 120), left(coalesce(p_shipping ->> 'line1', ''), 200), left(coalesce(p_shipping ->> 'line2', ''), 200),
    left(coalesce(p_shipping ->> 'city', ''), 120), left(coalesce(p_shipping ->> 'state', ''), 80), left(coalesce(p_shipping ->> 'postal_code', ''), 20),
    left(coalesce(p_shipping ->> 'country', 'US'), 2), left(coalesce(p_shipping ->> 'phone', ''), 40),
    left(coalesce(p_shipping ->> 'email', ''), 200), spec.provider
  ) returning id into oid;

  insert into buildtag.order_items (order_id, product_type, production_snapshot_id, print_specification_id, description, quantity, unit_price_cents, total_price_cents)
  values (oid, 'buildtag_decal', snap.id, spec.id, spec.name || ' ' || snap.width || 'x' || snap.height || snap.units, p_quantity, unit, subtotal);

  insert into buildtag.order_events (order_id, status, note, actor) values (oid, 'awaiting_payment', 'Order placed', 'customer');
  return oid;
end;
$$;

revoke execute on function buildtag.place_order(uuid, integer, jsonb) from public;
grant execute on function buildtag.place_order(uuid, integer, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Seed print specifications. Materials without a provider SKU are preview
-- only; flip `available` and set provider/provider_sku when a printer is
-- connected. Prices are placeholders in cents.
-- -----------------------------------------------------------------------------

insert into buildtag.print_specifications
  (id, name, size_id, width, height, material, finish, min_module_mm, price_cents, provider, provider_sku, available, sort_order)
values
  ('gloss-small',    'Standard Gloss',  'small',    3, 3, 'gloss',       'standard', 0.5, 899,  'manual', 'BT-GLOSS-3X3', true, 10),
  ('gloss-standard', 'Standard Gloss',  'standard', 4, 4, 'gloss',       'standard', 0.5, 1199, 'manual', 'BT-GLOSS-4X4', true, 11),
  ('gloss-wide',     'Standard Gloss',  'wide',     5, 3, 'gloss',       'standard', 0.5, 1199, 'manual', 'BT-GLOSS-5X3', true, 12),
  ('gloss-large',    'Standard Gloss',  'large',    5, 5, 'gloss',       'standard', 0.5, 1499, 'manual', 'BT-GLOSS-5X5', true, 13),
  ('matte-small',    'Standard Matte',  'small',    3, 3, 'matte',       'standard', 0.5, 899,  'manual', 'BT-MATTE-3X3', true, 20),
  ('matte-standard', 'Standard Matte',  'standard', 4, 4, 'matte',       'standard', 0.5, 1199, 'manual', 'BT-MATTE-4X4', true, 21),
  ('matte-wide',     'Standard Matte',  'wide',     5, 3, 'matte',       'standard', 0.5, 1199, 'manual', 'BT-MATTE-5X3', true, 22),
  ('matte-large',    'Standard Matte',  'large',    5, 5, 'matte',       'standard', 0.5, 1499, 'manual', 'BT-MATTE-5X5', true, 23),
  ('clear-standard', 'Transparent',     'standard', 4, 4, 'transparent', 'standard', 0.6, 1399, null, null, false, 30),
  ('clear-wide',     'Transparent',     'wide',     5, 3, 'transparent', 'standard', 0.6, 1399, null, null, false, 31),
  ('reflective-standard', 'Reflective', 'standard', 4, 4, 'reflective',  'standard', 0.6, 1699, null, null, false, 40),
  ('holo-standard',  'Holographic',     'standard', 4, 4, 'holographic', 'standard', 0.6, 1899, null, null, false, 50)
on conflict (id) do nothing;

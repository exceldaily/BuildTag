-- 0011: admin-issued free tags.
--   * recipients of a free tag can read the snapshot row + artwork that live
--     in the admin's storage folder
--   * admin_place_comp_order(): a paid, zero-total order for a member

drop policy if exists snapshots_select_order_recipient on buildtag.tag_production_snapshots;
create policy snapshots_select_order_recipient on buildtag.tag_production_snapshots for select to authenticated
  using (exists (
    select 1 from buildtag.order_items oi join buildtag.orders o on o.id = oi.order_id
    where oi.production_snapshot_id = tag_production_snapshots.id and o.user_id = (select auth.uid())
  ));

drop policy if exists buildtag_production_select_recipient on storage.objects;
create policy buildtag_production_select_recipient on storage.objects for select to authenticated
  using (bucket_id = 'buildtag-production' and exists (
    select 1 from buildtag.tag_production_snapshots s
    join buildtag.order_items oi on oi.production_snapshot_id = s.id
    join buildtag.orders o on o.id = oi.order_id
    where o.user_id = (select auth.uid()) and (s.svg_storage_path = storage.objects.name or s.png_storage_path = storage.objects.name)
  ));

create or replace function buildtag.admin_place_comp_order(p_snapshot_id uuid, p_user_id uuid, p_quantity integer, p_shipping jsonb default '{}'::jsonb, p_note text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  snap buildtag.tag_production_snapshots;
  spec buildtag.print_specifications;
  oid uuid;
  qty integer := least(greatest(coalesce(p_quantity, 1), 1), 50);
  recipient_email text;
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
    customer_email, fulfillment_provider, payment_provider, payment_reference, paid_at
  ) values (
    p_user_id, 'paid', 'paid', 0, 0, 0, 0, coalesce(spec.currency, 'USD'),
    left(coalesce(p_shipping ->> 'name', ''), 120), left(coalesce(p_shipping ->> 'line1', ''), 200), left(coalesce(p_shipping ->> 'line2', ''), 200),
    left(coalesce(p_shipping ->> 'city', ''), 120), left(coalesce(p_shipping ->> 'state', ''), 80), left(coalesce(p_shipping ->> 'postal_code', ''), 20),
    left(coalesce(nullif(p_shipping ->> 'country', ''), 'US'), 2), left(coalesce(p_shipping ->> 'phone', ''), 40),
    coalesce(recipient_email, ''), coalesce(spec.provider, 'manual'), 'comp', 'free-tag', now()
  ) returning id into oid;
  insert into buildtag.order_items (order_id, product_type, production_snapshot_id, print_specification_id, description, quantity, unit_price_cents, total_price_cents)
  values (oid, 'decal', snap.id, snap.print_specification_id, coalesce(spec.name, 'BuildTag decal') || ' ' || snap.width || 'x' || snap.height || 'in (free)', qty, 0, 0);
  insert into buildtag.order_events (order_id, status, note, actor) values (oid, 'paid', coalesce(nullif(p_note, ''), 'Free tag from BuildTag'), 'admin');
  return oid;
end;
$$;
revoke execute on function buildtag.admin_place_comp_order(uuid, uuid, integer, jsonb, text) from public;
grant execute on function buildtag.admin_place_comp_order(uuid, uuid, integer, jsonb, text) to authenticated;

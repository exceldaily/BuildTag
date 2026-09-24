import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ADMIN_STATUS_LABEL, formatMoneyCents, productionFileName, shippingLines } from "@/lib/orders/status";
import { proofUrl } from "@/lib/storage";
import { requireAdmin } from "@/lib/supabase/server";
import type { NotificationEventRow, OrderEventRow, OrderItemRow, OrderRow, PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OrderWorkbench } from "@/components/admin/order-workbench";
import { OrderStatusBadge } from "@/components/orders/status-badge";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

interface VehicleLite {
  id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  slug: string;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { client } = await requireAdmin();
  const { data: orderData } = await client.from("orders").select("*").eq("id", id).maybeSingle();
  if (!orderData) notFound();
  const order = orderData as OrderRow;

  const [{ data: itemsData }, { data: eventsData }, { data: notifData }] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", id).order("created_at"),
    client.from("order_events").select("*").eq("order_id", id).order("created_at"),
    client.from("notification_events").select("*").eq("order_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const items = (itemsData ?? []) as OrderItemRow[];
  const events = (eventsData ?? []) as OrderEventRow[];
  const notifications = (notifData ?? []) as NotificationEventRow[];
  const item = items[0] ?? null;

  let snapshot: ProductionSnapshotRow | null = null;
  let spec: PrintSpecificationRow | null = null;
  let vehicle: VehicleLite | null = null;
  if (item?.production_snapshot_id) {
    const { data: s } = await client.from("tag_production_snapshots").select("*").eq("id", item.production_snapshot_id).maybeSingle();
    snapshot = (s as ProductionSnapshotRow | null) ?? null;
    if (snapshot) {
      const [{ data: sp }, { data: v }] = await Promise.all([
        client.from("print_specifications").select("*").eq("id", snapshot.print_specification_id ?? "").maybeSingle(),
        client.from("vehicles").select("id, year, make, model, trim, nickname, slug").eq("id", snapshot.vehicle_id ?? "").maybeSingle(),
      ]);
      spec = (sp as PrintSpecificationRow | null) ?? null;
      vehicle = (v as VehicleLite | null) ?? null;
    }
  }

  const report = (snapshot?.validation_report ?? {}) as { server?: { ok?: boolean; checks?: { ok: boolean; decoded: string | null; width: number; error?: string }[] }; decode?: { ok: boolean; widthPx: number }[]; safety?: { quality?: string } };
  const ship = shippingLines(order);
  const vehicleLabel = vehicle ? `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`.trim() : "—";
  const copyDetails = [
    `BuildTags order ${order.order_number}`,
    `Product: ${item?.product_name ?? item?.description ?? ""}`,
    `SKU: ${item?.product_sku ?? spec?.sku ?? ""}`,
    `Size: ${item?.width ? `${Number(item.width)} x ${Number(item.height)} ${item.units === "mm" ? "mm" : "in"}` : ""}`,
    `Material: ${item?.material ?? ""} · Finish: ${spec?.name ?? item?.finish ?? ""}`,
    `Quantity: ${item?.quantity ?? 0}`,
    `Cut: contour (layer ${(spec?.cut_path_style as { layerName?: string } | null)?.layerName ?? "CutContour"}) · Bleed ${spec ? Number(spec.bleed) : ""} in · Safe ${spec ? Number(spec.safe_margin) : ""} in`,
    `Artwork: ${productionFileName(order.order_number, "production-svg")}`,
    `Ship to:`,
    ...ship,
    order.shipping_phone ? `Phone: ${order.shipping_phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const copyAddress = [...ship, order.shipping_phone].filter(Boolean).join("\n");

  return (
    <div className="mx-auto max-w-[1500px]">
      <Link href="/admin/orders" className="label-tech hover:text-foreground">
        ← Production queue
      </Link>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-4xl sm:text-5xl">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {fmt(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded border px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] uppercase", order.payment_status === "paid" ? "border-emerald-500/60 text-emerald-400" : "border-neon-amber/60 text-neon-amber")}>{order.payment_status}</span>
          <OrderStatusBadge status={order.status} audience="admin" />
        </div>
      </div>
      {order.status === "artwork_issue" && order.artwork_issue_reason && <p className="mt-3 rounded-md border border-neon-amber/50 bg-neon-amber/10 px-3 py-2 text-sm text-neon-amber">Artwork issue: {order.artwork_issue_reason}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {/* Design proof, large */}
          <section className="panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl">Design</h2>
              {snapshot && (
                <span className={cn("rounded border px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] uppercase", snapshot.validation_status === "passed" ? "border-emerald-500/60 text-emerald-400" : snapshot.validation_status === "failed" ? "border-destructive/60 text-destructive" : "border-neon-amber/60 text-neon-amber")}>
                  QR {snapshot.validation_status === "heuristic_only" ? "warning" : snapshot.validation_status}
                </span>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-[#100d1f] p-4 sm:p-8">
              {snapshot?.proof_storage_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proofUrl(snapshot.proof_storage_path)} alt="Production proof" className="mx-auto w-full max-w-[640px] object-contain" />
              ) : snapshot?.png_storage_path ? (
                // Older snapshots (before the proofs bucket): admin-only artwork route renders the production PNG.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/snapshots/${snapshot.id}/artwork?format=png&inline=1`} alt="Production artwork" className="mx-auto w-full max-w-[640px] object-contain" />
              ) : (
                <p className="text-center text-sm text-muted-foreground">No proof image stored for this snapshot.</p>
              )}
            </div>
            {snapshot && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <a href={`/api/snapshots/${snapshot.id}/artwork?format=svg&order=${order.order_number}`} className="btn-ghost btn-small">
                  Production SVG
                </a>
                <a href={`/api/snapshots/${snapshot.id}/artwork?format=png&order=${order.order_number}`} className="btn-ghost btn-small">
                  High-res PNG
                </a>
                <a href={`/admin/orders/${order.id}/production-sheet`} target="_blank" rel="noopener" className="btn-ghost btn-small col-span-2 sm:col-span-1">
                  Production sheet
                </a>
              </div>
            )}
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="panel p-4">
              <p className="label-tech">Customer</p>
              <p className="mt-2 font-medium">{order.shipping_name || "—"}</p>
              <p className="text-sm text-muted-foreground">{order.customer_email}</p>
              {order.customer_notes && <p className="mt-2 rounded-md border border-line p-2 text-sm">Customer note: {order.customer_notes}</p>}
            </section>
            <section className="panel p-4">
              <p className="label-tech">Shipping</p>
              <p className="mt-2 whitespace-pre-line text-sm">{ship.join("\n")}</p>
              {order.shipping_phone && <p className="text-sm text-muted-foreground">{order.shipping_phone}</p>}
              {order.tracking_number && (
                <p className="mt-2 text-sm">
                  {order.shipping_carrier ? `${order.shipping_carrier} ` : ""}
                  {order.tracking_url ? (
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="font-mono underline">
                      {order.tracking_number}
                    </a>
                  ) : (
                    <span className="font-mono">{order.tracking_number}</span>
                  )}
                </p>
              )}
            </section>
            <section className="panel p-4">
              <p className="label-tech">Vehicle</p>
              <p className="mt-2 font-medium">{vehicleLabel}</p>
              {vehicle?.nickname && <p className="text-sm text-muted-foreground">&ldquo;{vehicle.nickname}&rdquo;</p>}
              {vehicle && (
                <Link href={`/build/${vehicle.slug}`} className="mt-1 inline-block text-xs underline" target="_blank">
                  Open public build
                </Link>
              )}
            </section>
            <section className="panel p-4">
              <p className="label-tech">BuildTag product</p>
              <dl className="mt-2 space-y-1 text-sm">
                <Row k="Product" v={item?.product_name ?? item?.description ?? "—"} />
                <Row k="SKU" v={item?.product_sku ?? spec?.sku ?? "—"} />
                <Row k="Size" v={item?.width ? `${Number(item.width)} x ${Number(item.height)} ${item.units === "mm" ? "mm" : "in"}` : "—"} />
                <Row k="Material" v={item?.material ?? "—"} />
                <Row k="Finish" v={spec?.name ?? item?.finish ?? "—"} />
                <Row k="Quantity" v={String(item?.quantity ?? 0)} />
              </dl>
            </section>
            <section className="panel p-4">
              <p className="label-tech">QR</p>
              {snapshot ? (
                <dl className="mt-2 space-y-1 text-sm">
                  <Row k="Status" v={snapshot.validation_status === "heuristic_only" ? "WARNING" : snapshot.validation_status.toUpperCase()} />
                  <Row k="Server decode" v={report.server ? (report.server.ok ? `passed at ${(report.server.checks ?? []).map((c) => c.width).join("/")} px` : "FAILED") : "not run"} />
                  <Row k="Browser decode" v={report.decode ? `${report.decode.filter((d) => d.ok).length}/${report.decode.length} sizes` : "—"} />
                  <Row k="Design check" v={report.safety?.quality ?? "—"} />
                  <Row k="Destination" v={snapshot.qr_destination_at_order.replace(/^https?:\/\//, "")} mono />
                </dl>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No snapshot.</p>
              )}
              {snapshot && (
                <a href={snapshot.qr_destination_at_order} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-small mt-3">
                  Test QR destination
                </a>
              )}
            </section>
            <section className="panel p-4">
              <p className="label-tech">Payment</p>
              <dl className="mt-2 space-y-1 text-sm">
                <Row k="Subtotal" v={formatMoneyCents(order.subtotal_cents, order.currency)} />
                <Row k="Shipping" v={formatMoneyCents(order.shipping_cents, order.currency)} />
                <Row k="Tax" v={formatMoneyCents(order.tax_cents, order.currency)} />
                <Row k="Discount" v={formatMoneyCents(order.discount_cents, order.currency)} />
                <Row k="Total" v={formatMoneyCents(order.total_cents, order.currency)} strong />
                <Row k="Provider" v={order.payment_provider ?? "—"} />
                <Row k="Session" v={order.payment_reference ?? "—"} mono />
                <Row k="Payment id" v={order.payment_provider_payment_id ?? "—"} mono />
                <Row k="Paid" v={fmt(order.paid_at)} />
              </dl>
            </section>
          </div>

          <section className="panel p-4">
            <p className="label-tech">Production</p>
            <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <Row k="Snapshot" v={snapshot?.id ?? "—"} mono />
              <Row k="Artwork created" v={fmt(snapshot?.created_at)} />
              <Row k="Checksum" v={snapshot?.artwork_sha256 ? `sha256 ${snapshot.artwork_sha256}` : "—"} mono />
              <Row k="Proof approved" v={fmt(order.proof_approved_at)} />
              <Row k="Reviewed" v={fmt(order.reviewed_at)} />
              <Row k="Approved" v={fmt(order.approved_at)} />
              <Row k="Sent to maker" v={fmt(order.sent_to_maker_at)} />
              <Row k="In production" v={fmt(order.production_started_at)} />
              <Row k="Shipped" v={fmt(order.shipped_at)} />
              <Row k="Delivered" v={fmt(order.delivered_at)} />
              <Row k="Fulfillment" v={`${order.fulfillment_provider ?? "manual"}${order.provider_order_id ? ` · ${order.provider_order_id}` : ""}`} />
            </dl>
          </section>

          <section className="panel p-4">
            <p className="label-tech">Order timeline</p>
            <ul className="mt-2 divide-y divide-line text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="font-display text-xs font-bold tracking-[0.14em] uppercase">{e.previous_status && e.previous_status !== e.status ? `${ADMIN_STATUS_LABEL[e.previous_status]} → ` : ""}{ADMIN_STATUS_LABEL[e.status]}</span>
                    {e.note && <span className="text-muted-foreground"> · {e.note}</span>}
                    <span className="ml-2 text-xs text-muted-foreground">by {e.actor}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{fmt(e.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-4">
            <p className="label-tech">Notifications</p>
            {notifications.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line text-sm">
                {notifications.map((n) => (
                  <li key={n.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className={cn("font-display text-xs font-bold tracking-[0.14em] uppercase", n.status === "sent" ? "text-emerald-400" : n.status === "failed" ? "text-destructive" : "text-muted-foreground")}>{n.status}</span>
                      <span className="ml-2">{n.type.replace(/_/g, " ")}</span>
                      <span className="ml-2 text-muted-foreground">{n.recipient}</span>
                      {n.last_error && <span className="block text-xs text-destructive">{n.last_error}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmt(n.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <OrderWorkbench order={order} copyDetails={copyDetails} copyAddress={copyAddress} />
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v, mono = false, strong = false }: { k: string; v: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{k}</dt>
      <dd className={cn("min-w-0 break-all text-right", mono && "font-mono text-xs", strong && "font-display text-base font-bold")}>{v}</dd>
    </div>
  );
}

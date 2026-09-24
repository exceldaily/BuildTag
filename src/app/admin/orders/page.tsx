import type { Metadata } from "next";
import Link from "next/link";

import { ADMIN_STATUS_LABEL, formatMoneyCents } from "@/lib/orders/status";
import { requireAdmin } from "@/lib/supabase/server";
import type { OrderItemRow, OrderRow, OrderStatus, ProductionSnapshotRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/orders/status-badge";

export const metadata: Metadata = { title: "Production queue", robots: { index: false } };

const FILTERS: { id: OrderStatus | "all" | "open"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "needs_review", label: "Needs review" },
  { id: "artwork_issue", label: "Artwork issue" },
  { id: "artwork_approved", label: "Approved" },
  { id: "sent_to_maker", label: "Sent to maker" },
  { id: "in_production", label: "In production" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "awaiting_payment", label: "Unpaid" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

const OPEN: OrderStatus[] = ["paid", "needs_review", "artwork_approved", "artwork_issue", "preparing_artwork", "submitted_to_printer", "sent_to_maker", "in_production", "production_error"];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const filter = (typeof sp.status === "string" && FILTERS.some((f) => f.id === sp.status) ? sp.status : "open") as OrderStatus | "all" | "open";
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const { client } = await requireAdmin();

  // Counters
  const { data: allOrders } = await client.from("orders").select("id, status, order_number, created_at, shipping_name, customer_email, tracking_number").order("created_at", { ascending: false }).limit(2000);
  const all = (allOrders ?? []) as Pick<OrderRow, "id" | "status" | "order_number" | "created_at" | "shipping_name" | "customer_email" | "tracking_number">[];
  const count = (s: OrderStatus[]) => all.filter((o) => s.includes(o.status)).length;
  const counters = [
    { label: "Needs review", n: count(["needs_review", "paid"]), tone: "text-signal", href: "/admin/orders?status=needs_review" },
    { label: "Approved", n: count(["artwork_approved", "preparing_artwork"]), tone: "text-neon-cyan", href: "/admin/orders?status=artwork_approved" },
    { label: "Sent to maker", n: count(["sent_to_maker", "submitted_to_printer"]), tone: "text-[#c4b5fd]", href: "/admin/orders?status=sent_to_maker" },
    { label: "In production", n: count(["in_production"]), tone: "text-[#c4b5fd]", href: "/admin/orders?status=in_production" },
    { label: "Shipped", n: count(["shipped"]), tone: "text-emerald-400", href: "/admin/orders?status=shipped" },
    { label: "Issues", n: count(["artwork_issue", "production_error"]), tone: "text-neon-amber", href: "/admin/orders?status=artwork_issue" },
  ];

  // List
  let query = client.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter === "open") query = query.in("status", OPEN);
  else if (filter !== "all") query = query.eq("status", filter);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, "")}%`;
    query = query.or(`order_number.ilike.${like},shipping_name.ilike.${like},customer_email.ilike.${like},tracking_number.ilike.${like}`);
  }
  const { data } = await query;
  let orders = (data ?? []) as OrderRow[];

  const { data: itemsData } = orders.length ? await client.from("order_items").select("*").in("order_id", orders.map((o) => o.id)) : { data: [] };
  const items = (itemsData ?? []) as OrderItemRow[];
  const snapIds = items.map((i) => i.production_snapshot_id).filter((v): v is string => Boolean(v));
  const { data: snapsData } = snapIds.length ? await client.from("tag_production_snapshots").select("id, vehicle_id, validation_status, qr_destination_at_order").in("id", snapIds) : { data: [] };
  const snaps = new Map(((snapsData ?? []) as Pick<ProductionSnapshotRow, "id" | "vehicle_id" | "validation_status" | "qr_destination_at_order">[]).map((s) => [s.id, s]));
  const vehicleIds = [...new Set([...snaps.values()].map((s) => s.vehicle_id).filter((v): v is string => typeof v === "string"))];
  const { data: vehiclesData } = vehicleIds.length ? await client.from("vehicles").select("id, year, make, model, nickname").in("id", vehicleIds) : { data: [] };
  const vehicles = new Map(((vehiclesData ?? []) as { id: string; year: number | null; make: string; model: string; nickname: string }[]).map((v) => [v.id, v]));

  // Search by vehicle or QR code too (in memory, list is small)
  if (q) {
    const needle = q.toLowerCase();
    const matchesQr = (o: OrderRow) => items.filter((i) => i.order_id === o.id).some((i) => (i.production_snapshot_id && snaps.get(i.production_snapshot_id)?.qr_destination_at_order?.toLowerCase().includes(needle)) || false);
    const matchesVehicle = (o: OrderRow) =>
      items.filter((i) => i.order_id === o.id).some((i) => {
        const v = i.production_snapshot_id ? vehicles.get(snaps.get(i.production_snapshot_id ?? "")?.vehicle_id ?? "") : null;
        return v ? `${v.year ?? ""} ${v.make} ${v.model} ${v.nickname}`.toLowerCase().includes(needle) : false;
      });
    const direct = new Set(orders.map((o) => o.id));
    const extra = all.filter((o) => !direct.has(o.id)).map((o) => o.id);
    if (extra.length) {
      const { data: extraOrders } = await client.from("orders").select("*").in("id", extra.slice(0, 200));
      const { data: extraItems } = await client.from("order_items").select("*").in("order_id", extra.slice(0, 200));
      for (const it of (extraItems ?? []) as OrderItemRow[]) items.push(it);
      const extraSnapIds = ((extraItems ?? []) as OrderItemRow[]).map((i) => i.production_snapshot_id).filter((v): v is string => typeof v === "string" && !snaps.has(v));
      if (extraSnapIds.length) {
        const { data: es } = await client.from("tag_production_snapshots").select("id, vehicle_id, validation_status, qr_destination_at_order").in("id", extraSnapIds);
        for (const s of (es ?? []) as Pick<ProductionSnapshotRow, "id" | "vehicle_id" | "validation_status" | "qr_destination_at_order">[]) snaps.set(s.id, s);
        const evIds = [...new Set([...snaps.values()].map((s) => s.vehicle_id).filter((v): v is string => typeof v === "string"))].filter((id) => !vehicles.has(id));
        if (evIds.length) {
          const { data: ev } = await client.from("vehicles").select("id, year, make, model, nickname").in("id", evIds);
          for (const v of (ev ?? []) as { id: string; year: number | null; make: string; model: string; nickname: string }[]) vehicles.set(v.id, v);
        }
      }
      const found = ((extraOrders ?? []) as OrderRow[]).filter((o) => matchesQr(o) || matchesVehicle(o));
      orders = [...orders, ...found].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Production command center</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manual fulfillment. Review artwork, send it to the maker, add tracking. Nothing ships without your approval.</p>
        </div>
        <form action="/admin/orders" method="get" className="flex gap-2">
          {filter !== "open" && <input type="hidden" name="status" value={filter} />}
          <input name="q" defaultValue={q} placeholder="order #, customer, email, vehicle, QR code, tracking" className="field h-10 w-full lg:w-96" aria-label="Search orders" />
          <button type="submit" className="btn-ghost h-10 shrink-0">
            Search
          </button>
        </form>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {counters.map((c) => (
          <Link key={c.label} href={c.href} className="bg-surface px-4 py-3 transition-colors hover:bg-white/5">
            <dt className="label-tech">{c.label}</dt>
            <dd className={cn("mt-1 font-display text-3xl font-extrabold tabular-nums", c.n > 0 ? c.tone : "text-muted-foreground")}>{c.n}</dd>
          </Link>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.id} href={f.id === "open" ? "/admin/orders" : `/admin/orders?status=${f.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("btn-ghost btn-small", f.id === filter && "border-signal text-foreground")}>
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:label-tech">
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Payment</th>
              <th>QR</th>
              <th>Production</th>
              <th>Shipping</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => {
              const its = items.filter((i) => i.order_id === o.id);
              const first = its[0];
              const snap = first?.production_snapshot_id ? snaps.get(first.production_snapshot_id) : null;
              const v = snap?.vehicle_id ? vehicles.get(snap.vehicle_id) : null;
              const qty = its.reduce((s, i) => s + i.quantity, 0);
              return (
                <tr key={o.id} className="[&>td]:px-3 [&>td]:py-2.5 [&>td]:align-middle hover:bg-white/5">
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-sm font-semibold text-foreground underline-offset-2 hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="max-w-[180px]">
                    <span className="block truncate">{o.shipping_name || "—"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{o.customer_email}</span>
                  </td>
                  <td className="max-w-[200px] truncate">{v ? `${v.year ?? ""} ${v.make} ${v.model}${v.nickname ? ` "${v.nickname}"` : ""}` : "—"}</td>
                  <td className="max-w-[220px] truncate text-xs">{first ? `${first.product_name ?? first.description}${first.width ? ` ${Number(first.width)}x${Number(first.height)}` : ""}${first.material ? ` ${first.material}` : ""}` : "—"}</td>
                  <td className="tabular-nums">{qty}</td>
                  <td className="tabular-nums">{formatMoneyCents(o.total_cents, o.currency)}</td>
                  <td>
                    <span className={cn("font-display text-[10px] font-bold tracking-[0.14em] uppercase", o.payment_status === "paid" ? "text-emerald-400" : o.payment_status === "refunded" ? "text-muted-foreground" : "text-neon-amber")}>{o.payment_status}</span>
                  </td>
                  <td>
                    {snap ? (
                      <span className={cn("font-display text-[10px] font-bold tracking-[0.14em] uppercase", snap.validation_status === "passed" ? "text-emerald-400" : snap.validation_status === "failed" ? "text-destructive" : "text-neon-amber")}>{snap.validation_status === "heuristic_only" ? "warning" : snap.validation_status}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <OrderStatusBadge status={o.status} audience="admin" />
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {o.tracking_number ? (
                      <span className="font-mono">{o.shipping_carrier ? `${o.shipping_carrier} ` : ""}{o.tracking_number}</span>
                    ) : o.status === "shipped" || o.status === "delivered" ? (
                      "no tracking"
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  {q ? "No orders match that search." : filter === "open" ? "Nothing in the queue. Enjoy it." : `No ${ADMIN_STATUS_LABEL[filter as OrderStatus] ?? ""} orders.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

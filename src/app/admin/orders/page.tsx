import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL, type OrderItemRow, type OrderRow, type OrderStatus } from "@/lib/types";
import { AdminOrderRow } from "@/components/admin/order-row";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

const FILTERS: (OrderStatus | "all")[] = ["all", "awaiting_payment", "paid", "preparing_artwork", "submitted_to_printer", "in_production", "shipped", "production_error"];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && FILTERS.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus | "all") : "all";
  const { client } = await requireAdmin();
  let query = client.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  const orders = (data ?? []) as OrderRow[];
  const { data: items } = orders.length ? await client.from("order_items").select("*").in("order_id", orders.map((o) => o.id)) : { data: [] };
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const it of (items ?? []) as OrderItemRow[]) itemsByOrder.set(it.order_id, [...(itemsByOrder.get(it.order_id) ?? []), it]);

  return (
    <div>
      <p className="eyebrow">Fulfillment queue</p>
      <h1 className="mt-2 text-4xl">Orders</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`} className={`btn-ghost btn-small ${f === status ? "border-signal text-foreground" : ""}`}>
            {f === "all" ? "All" : ORDER_STATUS_LABEL[f]}
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Provider: manual queue. Download artwork, send it to the shop, and move the status along. Connecting a printer API replaces the manual steps without touching orders.</p>
      <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
        {orders.map((o) => (
          <AdminOrderRow key={o.id} order={o} items={itemsByOrder.get(o.id) ?? []} />
        ))}
        {orders.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">No orders.</li>}
      </ul>
    </div>
  );
}

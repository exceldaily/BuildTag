import type { Metadata } from "next";
import Link from "next/link";

import { requireProfile } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL, type OrderRow } from "@/lib/types";
import { OrderStatusBadge } from "@/components/orders/status-badge";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function OrdersPage() {
  const { client, user } = await requireProfile("/dashboard/orders");
  const { data } = await client.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const orders = (data ?? []) as OrderRow[];

  return (
    <div>
      <p className="eyebrow">Physical BuildTags</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Orders</h1>
      {orders.length === 0 ? (
        <div className="panel mt-8 px-6 py-14 text-center">
          <p className="font-display text-2xl uppercase">No orders yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Design a BuildTag, approve the proof, and order printed decals from the designer.</p>
          <Link href="/dashboard" className="btn-signal mt-6">
            Go to the garage
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-lg border border-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/dashboard/orders/${o.id}`} className="flex flex-col gap-2 px-4 py-4 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={o.status} />
                  <span className="font-display text-lg font-bold tabular-nums">${(o.total_cents / 100).toFixed(2)}</span>
                </div>
                <span className="sr-only">{ORDER_STATUS_LABEL[o.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

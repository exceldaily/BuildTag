import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPaymentProvider } from "@/lib/payments";
import { requireProfile } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL, type OrderEventRow, type OrderItemRow, type OrderRow, type ProductionSnapshotRow } from "@/lib/types";
import { OrderActions } from "@/components/orders/order-actions";
import { ORDER_PIPELINE, OrderStatusBadge } from "@/components/orders/status-badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default async function OrderDetailPage({ params, searchParams }: PageProps<"/dashboard/orders/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { client, user } = await requireProfile();
  const { data } = await client.from("orders").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const order = data as OrderRow;
  const [{ data: items }, { data: events }] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", id),
    client.from("order_events").select("*").eq("order_id", id).order("created_at"),
  ]);
  const snapshotIds = ((items ?? []) as OrderItemRow[]).map((i) => i.production_snapshot_id).filter((v): v is string => Boolean(v));
  const { data: snaps } = snapshotIds.length ? await client.from("tag_production_snapshots").select("*").in("id", snapshotIds) : { data: [] };
  const snapshots = new Map(((snaps ?? []) as ProductionSnapshotRow[]).map((s) => [s.id, s]));
  const paymentsEnabled = getPaymentProvider().enabled;
  const stepIndex = ORDER_PIPELINE.indexOf(order.status);

  return (
    <div className="mx-auto max-w-4xl xl:max-w-6xl">
      <Link href="/dashboard/orders" className="label-tech hover:text-foreground">
        ← Orders
      </Link>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl">Order {order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {sp.paid === "1" && order.payment_status !== "paid" && (
        <p className="mt-4 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-2 text-sm">Thanks. Your payment is being confirmed; this page updates once the provider reports it.</p>
      )}

      {/* Timeline */}
      <ol className="mt-8 grid grid-cols-7 gap-1">
        {ORDER_PIPELINE.map((s, i) => (
          <li key={s} className="text-center">
            <div className={cn("h-1.5 rounded", i <= stepIndex && order.status !== "cancelled" && order.status !== "production_error" ? "bg-signal" : "bg-surface-2")} />
            <p className={cn("mt-1 hidden text-[10px] leading-tight sm:block", i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>{ORDER_STATUS_LABEL[s]}</p>
          </li>
        ))}
      </ol>
      {(order.status === "cancelled" || order.status === "production_error") && (
        <p className={cn("mt-2 text-sm", order.status === "cancelled" ? "text-muted-foreground" : "text-destructive")}>{order.status === "cancelled" ? "This order was cancelled." : "Production hit a problem. We will contact you; nothing is charged twice."}</p>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl">Items</h2>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {((items ?? []) as OrderItemRow[]).map((it) => {
                const snap = it.production_snapshot_id ? snapshots.get(it.production_snapshot_id) : null;
                return (
                  <li key={it.id} className="flex gap-4 p-4">
                    {snap && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/snapshots/${snap.id}/artwork?format=png`} alt="Approved BuildTag proof" className="size-24 shrink-0 rounded-md bg-[#100d1f] object-contain" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{it.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.quantity} × ${(it.unit_price_cents / 100).toFixed(2)} · ${(it.total_price_cents / 100).toFixed(2)}
                      </p>
                      {snap && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          QR destination frozen at order: <span className="font-mono">{snap.qr_destination_at_order}</span> · validation {snap.validation_status}
                        </p>
                      )}
                      {snap && (
                        <div className="mt-2 flex gap-2">
                          <a href={`/api/snapshots/${snap.id}/artwork?format=svg`} className="btn-ghost btn-small h-7 text-[10px]">
                            SVG
                          </a>
                          <a href={`/api/snapshots/${snap.id}/artwork?format=png`} className="btn-ghost btn-small h-7 text-[10px]">
                            PNG
                          </a>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl">History</h2>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-sm">
              {((events ?? []) as OrderEventRow[]).map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-2.5">
                  <span>
                    {ORDER_STATUS_LABEL[e.status]}
                    {e.note && <span className="text-muted-foreground"> · {e.note}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel p-4 text-sm">
            <p className="label-tech">Total</p>
            <dl className="mt-2 space-y-1">
              <Row k="Subtotal" v={`$${(order.subtotal_cents / 100).toFixed(2)}`} />
              <Row k="Shipping" v={order.shipping_cents === 0 ? "Free" : `$${(order.shipping_cents / 100).toFixed(2)}`} />
              <Row k="Tax" v={`$${(order.tax_cents / 100).toFixed(2)}`} />
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold uppercase">
                <dt>Total</dt>
                <dd>${(order.total_cents / 100).toFixed(2)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">Payment: {order.payment_status}</p>
          </section>
          <section className="panel p-4 text-sm">
            <p className="label-tech">Ships to</p>
            <p className="mt-2 whitespace-pre-line">
              {[order.shipping_name, order.shipping_line1, order.shipping_line2, `${order.shipping_city}, ${order.shipping_state} ${order.shipping_postal_code}`, order.shipping_country].filter(Boolean).join("\n")}
            </p>
            {order.tracking_number && (
              <p className="mt-3">
                Tracking:{" "}
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="underline">
                    {order.tracking_number}
                  </a>
                ) : (
                  <span className="font-mono">{order.tracking_number}</span>
                )}
              </p>
            )}
          </section>
          <OrderActions order={order} paymentsEnabled={paymentsEnabled} />
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

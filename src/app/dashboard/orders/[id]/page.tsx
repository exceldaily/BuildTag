import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ScanLine } from "lucide-react";

import { CUSTOMER_STATUS_LABEL, customerStepState, formatMoneyCents, shippingLines } from "@/lib/orders/status";
import { getPaymentProvider } from "@/lib/payments";
import { proofUrl } from "@/lib/storage";
import { requireProfile } from "@/lib/supabase/server";
import type { OrderEventRow, OrderItemRow, OrderRow, ProductionSnapshotRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OrderActions } from "@/components/orders/order-actions";
import { OrderStatusBadge } from "@/components/orders/status-badge";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

/** Events a customer should see, in their words. */
const CUSTOMER_EVENT_NOTE: Partial<Record<string, string>> = {
  awaiting_payment: "Order placed",
  payment_processing: "Checkout started",
  paid: "Payment confirmed",
  needs_review: "Payment confirmed, artwork in production review",
  artwork_approved: "Artwork approved for production",
  artwork_issue: "We are double-checking the artwork",
  sent_to_maker: "Sent to production",
  submitted_to_printer: "Sent to production",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  production_error: "Production hit a snag; we are on it",
};

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
  const steps = customerStepState(order.status);
  const stalled = order.status === "cancelled" || order.status === "refunded";
  const lines = shippingLines(order);

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
        <p className="mt-4 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-2 text-sm">Thanks. Your payment is being confirmed by Stripe; this page updates as soon as that lands, usually within a few seconds.</p>
      )}

      {!stalled ? (
        <ol className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {steps.map((s, i) => {
            const nextDone = steps[i + 1]?.done ?? false;
            const current = s.done && !nextDone;
            return (
              <li key={s.key} className="text-center">
                <div className={cn("h-1.5 rounded", s.done ? "bg-signal" : "bg-surface-2")} />
                <p className={cn("mt-2 flex items-center justify-center gap-1 text-[11px] leading-tight", s.done ? "text-foreground" : "text-muted-foreground", current && "font-semibold")}>
                  {s.done ? <Check className="size-3 text-signal" aria-hidden="true" /> : <span className="inline-block size-3 rounded-full border border-line" aria-hidden="true" />}
                  {s.label}
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{order.status === "cancelled" ? "This order was cancelled." : "This order was refunded."}</p>
      )}
      <p className="mt-3 text-sm">
        <span className="text-muted-foreground">Right now: </span>
        {CUSTOMER_STATUS_LABEL[order.status]}
        {order.status === "artwork_issue" && <span className="text-muted-foreground">. We will reach out with details; nothing is charged twice.</span>}
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl">Your BuildTag</h2>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {((items ?? []) as OrderItemRow[]).map((it) => {
                const snap = it.production_snapshot_id ? snapshots.get(it.production_snapshot_id) : null;
                return (
                  <li key={it.id} className="flex flex-col gap-4 p-4 sm:flex-row">
                    {snap?.proof_storage_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proofUrl(snap.proof_storage_path)} alt="Approved BuildTag proof" className="w-full max-w-[220px] shrink-0 self-start rounded-md bg-[#100d1f] object-contain sm:w-44" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{it.product_name ?? it.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {it.width && it.height ? `${Number(it.width)} x ${Number(it.height)} ${it.units === "mm" ? "mm" : "in"} · ` : ""}
                        {it.material ? `${it.material} · ` : ""}
                        {it.quantity} × {formatMoneyCents(it.unit_price_cents, order.currency)}
                      </p>
                      {snap && (
                        <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                          <ScanLine className="mt-0.5 size-3.5 shrink-0 text-neon-cyan" aria-hidden="true" />
                          <span>
                            Permanent QR <span className="font-mono">{snap.qr_destination_at_order.replace(/^https?:\/\//, "")}</span>. Scan check: {snap.validation_status === "passed" ? "passed" : snap.validation_status === "heuristic_only" ? "passed with a warning" : "failed"}.
                          </span>
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">Artwork is frozen for production. Edits to your build page do not change what prints.</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl">History</h2>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-sm">
              {((events ?? []) as OrderEventRow[])
                .filter((e) => e.actor !== "admin" || e.status !== e.previous_status)
                .map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span>{CUSTOMER_EVENT_NOTE[e.status] ?? CUSTOMER_STATUS_LABEL[e.status]}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </li>
                ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel p-4 text-sm">
            <p className="label-tech">Total</p>
            <dl className="mt-2 space-y-1">
              <Row k="Subtotal" v={formatMoneyCents(order.subtotal_cents, order.currency)} />
              <Row k="Shipping" v={order.shipping_cents === 0 ? "Free" : formatMoneyCents(order.shipping_cents, order.currency)} />
              {order.discount_cents > 0 && <Row k="Discount" v={`-${formatMoneyCents(order.discount_cents, order.currency)}`} />}
              <Row k="Tax" v={formatMoneyCents(order.tax_cents, order.currency)} />
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold uppercase">
                <dt>Total</dt>
                <dd>{formatMoneyCents(order.total_cents, order.currency)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Payment: {order.payment_status === "paid" ? `paid${order.paid_at ? ` ${new Date(order.paid_at).toLocaleDateString()}` : ""}` : order.payment_status === "processing" ? "confirming" : order.payment_status}
            </p>
          </section>
          <section className="panel p-4 text-sm">
            <p className="label-tech">Ships to</p>
            <p className="mt-2 whitespace-pre-line">{lines.join("\n")}</p>
            {order.tracking_number && (
              <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
                <p className="label-tech text-emerald-400">Tracking{order.shipping_carrier ? ` · ${order.shipping_carrier}` : ""}</p>
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-1 block font-mono text-sm underline">
                    {order.tracking_number}
                  </a>
                ) : (
                  <p className="mt-1 font-mono text-sm">{order.tracking_number}</p>
                )}
                {order.shipped_at && <p className="mt-1 text-xs text-muted-foreground">Shipped {new Date(order.shipped_at).toLocaleDateString()}</p>}
              </div>
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

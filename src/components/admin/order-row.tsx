"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { adminSetOrderStatusAction } from "@/lib/actions/orders";
import { ORDER_STATUS_LABEL, type OrderItemRow, type OrderRow, type OrderStatus } from "@/lib/types";
import { OrderStatusBadge } from "@/components/orders/status-badge";

const NEXT: OrderStatus[] = ["paid", "preparing_artwork", "submitted_to_printer", "in_production", "shipped", "delivered", "production_error", "cancelled"];

export function AdminOrderRow({ order, items }: { order: OrderRow; items: OrderItemRow[] }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [pending, start] = useTransition();

  return (
    <li className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm">{order.order_number}</span>
          <OrderStatusBadge status={order.status} />
          <span className="font-display text-base font-bold tabular-nums">${(order.total_cents / 100).toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {order.shipping_name} · {order.shipping_city}, {order.shipping_state} {order.shipping_country} · {order.customer_email} · payment {order.payment_status}
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center gap-2">
              <span>
                {it.quantity} × {it.description}
              </span>
              {it.production_snapshot_id && (
                <>
                  <a href={`/api/snapshots/${it.production_snapshot_id}/artwork?format=svg`} className="btn-ghost btn-small h-6 text-[10px]">
                    SVG
                  </a>
                  <a href={`/api/snapshots/${it.production_snapshot_id}/artwork?format=png`} className="btn-ghost btn-small h-6 text-[10px]">
                    PNG
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await adminSetOrderStatusAction({ orderId: order.id, status, note, trackingNumber: tracking, trackingUrl });
            if (!res.ok) toast.error(res.error);
            else toast.success(`Set to ${ORDER_STATUS_LABEL[status]}`);
          });
        }}
      >
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="field col-span-2 h-9 text-xs" aria-label="Status">
          {[order.status, ...NEXT.filter((s) => s !== order.status)].map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="field h-9 text-xs" aria-label="Tracking number" />
        <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="Tracking URL" className="field h-9 text-xs" aria-label="Tracking URL" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the customer" className="field col-span-2 h-9 text-xs" aria-label="Note" />
        <button type="submit" disabled={pending} className="btn-signal btn-small col-span-2">
          {pending ? "Saving…" : "Update order"}
        </button>
      </form>
    </li>
  );
}

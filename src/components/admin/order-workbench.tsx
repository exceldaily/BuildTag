"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { adminSetOrderNotesAction, adminSetOrderStatusAction } from "@/lib/actions/orders";
import { ARTWORK_ISSUE_REASONS, TRANSITIONS } from "@/lib/orders/status";
import type { OrderRow, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Manual fulfillment controls. Only the actions that make sense for the
 * current status are shown; the database re-checks every transition.
 */
export function OrderWorkbench({ order, copyDetails, copyAddress }: { order: OrderRow; copyDetails: string; copyAddress: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<string>(ARTWORK_ISSUE_REASONS[0]);
  const [reasonOther, setReasonOther] = useState("");
  const [carrier, setCarrier] = useState(order.shipping_carrier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [showIssue, setShowIssue] = useState(false);
  const [showTracking, setShowTracking] = useState(false);

  const can = (s: OrderStatus) => (TRANSITIONS[order.status] ?? []).includes(s);

  const move = (status: OrderStatus, extra: Partial<Parameters<typeof adminSetOrderStatusAction>[0]> = {}, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const res = await adminSetOrderStatusAction({ orderId: order.id, status, note, ...extra });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Order updated");
      setNote("");
      setShowIssue(false);
      setShowTracking(false);
      router.refresh();
    });
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const closed = order.status === "cancelled" || order.status === "refunded";

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <p className="label-tech">Actions</p>
        {closed ? (
          <p className="mt-2 text-sm text-muted-foreground">This order is closed.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {(order.status === "awaiting_payment" || order.status === "payment_processing") && (
              <button type="button" disabled={pending} onClick={() => move("paid", {}, "Mark this order as paid outside Stripe? It will move to review.")} className="btn-signal btn-small">
                Mark paid (offline)
              </button>
            )}
            {can("artwork_approved") && (
              <button type="button" disabled={pending} onClick={() => move("artwork_approved")} className="btn-signal btn-small">
                Approve artwork
              </button>
            )}
            {can("artwork_issue") && (
              <button type="button" disabled={pending} onClick={() => setShowIssue((v) => !v)} className="btn-ghost btn-small border-neon-amber/60 text-neon-amber">
                Mark artwork issue
              </button>
            )}
            {can("sent_to_maker") && (
              <button type="button" disabled={pending} onClick={() => move("sent_to_maker")} className="btn-signal btn-small">
                Mark sent to maker
              </button>
            )}
            {can("in_production") && (
              <button type="button" disabled={pending} onClick={() => move("in_production")} className="btn-ghost btn-small">
                Mark in production
              </button>
            )}
            {can("shipped") && (
              <button type="button" disabled={pending} onClick={() => setShowTracking((v) => !v)} className="btn-signal btn-small">
                Add tracking & ship
              </button>
            )}
            {can("delivered") && (
              <button type="button" disabled={pending} onClick={() => move("delivered")} className="btn-ghost btn-small">
                Mark delivered
              </button>
            )}
            {can("production_error") && (
              <button type="button" disabled={pending} onClick={() => move("production_error", {}, "Flag a production issue on this order?")} className="btn-ghost btn-small border-destructive/50 text-destructive">
                Production issue
              </button>
            )}
            {can("cancelled") && (
              <button type="button" disabled={pending} onClick={() => move("cancelled", {}, "Cancel this order? This cannot be undone.")} className="btn-ghost btn-small text-muted-foreground">
                Cancel
              </button>
            )}
            {can("refunded") && (
              <button type="button" disabled={pending} onClick={() => move("refunded", {}, "Mark as refunded? Issue the refund in Stripe first; this only records it.")} className="btn-ghost btn-small text-muted-foreground">
                Refund
              </button>
            )}
          </div>
        )}

        {showIssue && (
          <div className="mt-4 rounded-md border border-neon-amber/40 bg-neon-amber/5 p-3">
            <p className="field-label">Reason</p>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="field">
              {ARTWORK_ISSUE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {reason === "Other" && <input value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} placeholder="Describe the issue" className="field mt-2" maxLength={200} />}
            <button type="button" disabled={pending} onClick={() => move("artwork_issue", { reason: reason === "Other" ? reasonOther || "Other" : reason })} className="btn-signal btn-small mt-3">
              Flag issue
            </button>
            <p className="mt-2 text-xs text-muted-foreground">The customer sees &ldquo;We need to check something&rdquo; and gets a short email. The reason stays internal.</p>
          </div>
        )}

        {showTracking && (
          <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (USPS, UPS…)" className="field h-9 text-sm" aria-label="Carrier" />
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="field h-9 text-sm" aria-label="Tracking number" />
              <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="Tracking URL" className="field h-9 text-sm" aria-label="Tracking URL" />
            </div>
            <button type="button" disabled={pending} onClick={() => move("shipped", { carrier, trackingNumber: tracking, trackingUrl })} className="btn-signal btn-small mt-3">
              Mark shipped & email customer
            </button>
          </div>
        )}

        {!closed && (
          <label className="mt-4 block">
            <span className="field-label">Note for the timeline (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} className="field h-9 text-sm" placeholder="Why, what changed" />
          </label>
        )}
      </section>

      <section className="panel p-4">
        <p className="label-tech">Manufacturer package</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`/api/admin/orders/${order.id}/package`} className="btn-signal btn-small col-span-2">
            Download all production files (ZIP)
          </a>
          <button type="button" onClick={() => copy(copyDetails, "Production details")} className="btn-ghost btn-small">
            Copy details
          </button>
          <button type="button" onClick={() => copy(copyAddress, "Shipping address")} className="btn-ghost btn-small">
            Copy address
          </button>
          <a href={`/admin/orders/${order.id}/production-sheet`} target="_blank" rel="noopener" className="btn-ghost btn-small col-span-2">
            Open production sheet (print)
          </a>
        </div>
      </section>

      <section className="panel p-4">
        <p className="label-tech">Admin notes</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 4000))} rows={4} className={cn("field-textarea mt-2 min-h-24 text-sm")} placeholder="Internal only. Never shown to the customer or the maker." />
        <button
          type="button"
          disabled={pending || notes === (order.admin_notes ?? "")}
          onClick={() =>
            start(async () => {
              const res = await adminSetOrderNotesAction(order.id, notes);
              if (!res.ok) toast.error(res.error);
              else {
                toast.success("Notes saved");
                router.refresh();
              }
            })
          }
          className="btn-ghost btn-small mt-2"
        >
          Save notes
        </button>
      </section>
    </div>
  );
}

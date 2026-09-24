"use client";

import { ScanLine } from "lucide-react";
import { useActionState, useState } from "react";

import { placeOrderAction } from "@/lib/actions/orders";
import type { PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

interface Defaults {
  name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
}

function unitPrice(cents: number, qty: number): number {
  if (qty >= 10) return Math.round(cents * 0.8);
  if (qty >= 3) return Math.round(cents * 0.9);
  return cents;
}

const MATERIAL_LABEL: Record<string, string> = { gloss: "Automotive vinyl, gloss", matte: "Automotive vinyl, matte", transparent: "Transparent vinyl", reflective: "Reflective vinyl", holographic: "Holographic vinyl" };

/**
 * FINAL PROOF + shipping. The proof is the frozen production snapshot; the
 * customer must scan-test it and tick the approval box before an order can
 * be placed. Payment happens next, and only the Stripe webhook can mark it paid.
 */
export function CheckoutForm({ snapshot, spec, proofSrc, initialQuantity, email, defaults }: { snapshot: ProductionSnapshotRow; spec: PrintSpecificationRow | null; proofSrc: string | null; initialQuantity: number; email: string; defaults: Defaults }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(placeOrderAction, null);
  const [qty, setQty] = useState(initialQuantity);
  const [approved, setApproved] = useState(false);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const qrFailed = snapshot.validation_status === "failed";
  const qrWarning = snapshot.validation_status === "heuristic_only";
  const orderable = Boolean(spec && spec.available && spec.provider_sku && !qrFailed);
  const unit = spec ? unitPrice(spec.price_cents, qty) : 0;
  const subtotal = unit * qty;
  const shipping = subtotal >= 5000 ? 0 : 599;
  const sizeLabel = `${Number(snapshot.width)} x ${Number(snapshot.height)} ${snapshot.units === "in" ? "inches" : "mm"}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Proof */}
      <div className="space-y-6">
        <section className="panel p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl">Final proof</h2>
            <span className={qrFailed ? "rounded border border-destructive/60 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] text-destructive uppercase" : qrWarning ? "rounded border border-neon-amber/60 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] text-neon-amber uppercase" : "rounded border border-emerald-500/60 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] text-emerald-400 uppercase"}>
              QR {qrFailed ? "failed" : qrWarning ? "warning" : "passed"}
            </span>
          </div>
          <div className="mt-4 rounded-lg bg-[#100d1f] p-4 sm:p-8">
            {proofSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofSrc} alt="Final BuildTag proof" className="mx-auto max-h-[520px] w-full max-w-[520px] object-contain" />
            ) : (
              <p className="text-center text-sm text-muted-foreground">Proof preview is not available for this snapshot.</p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-md border border-neon-cyan/40 bg-neon-cyan/5 p-3 sm:flex-row sm:items-center">
            <ScanLine className="size-6 shrink-0 text-neon-cyan" aria-hidden="true" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Scan the QR above with your phone before ordering.</p>
              <p className="text-muted-foreground">
                Permanent QR: <span className="font-mono break-all">{snapshot.qr_destination_at_order.replace(/^https?:\/\//, "")}</span>. It stays yours even if you rename the build later.
              </p>
            </div>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row k="Product" v={spec?.product_name ?? "Exterior BuildTag"} />
            <Row k="Size" v={sizeLabel} />
            <Row k="Material" v={MATERIAL_LABEL[snapshot.material] ?? snapshot.material} />
            <Row k="Finish" v={spec?.name ?? snapshot.finish} />
            <Row k="Quantity" v={String(qty)} />
            <Row k="QR status" v={qrFailed ? "FAILED" : qrWarning ? "WARNING" : "PASSED"} />
          </dl>
          {qrFailed && <p className="mt-3 text-sm text-destructive">This artwork failed the scan test on our server, so it cannot be ordered. Go back to the designer, adjust the design and approve it again.</p>}
          {qrWarning && <p className="mt-3 text-sm text-neon-amber">The decoder read this code but one of the design checks flagged a risk. Test-scan it carefully; production rules allow it.</p>}
        </section>
      </div>

      {/* Shipping + approval */}
      <form action={action} className="space-y-4 lg:sticky lg:top-20 lg:self-start" noValidate>
        <input type="hidden" name="snapshot_id" value={snapshot.id} />
        <input type="hidden" name="quantity" value={qty} />
        <input type="hidden" name="email" value={email} />
        <section className="panel space-y-4 p-4">
          <h2 className="text-2xl">Shipping</h2>
          <Field label="Full name" name="name" defaultValue={defaults.name} error={errors.name} autoComplete="name" />
          <Field label="Company (optional)" name="company" defaultValue={defaults.company} error={errors.company} autoComplete="organization" />
          <Field label="Address line 1" name="line1" defaultValue={defaults.line1} error={errors.line1} autoComplete="address-line1" />
          <Field label="Address line 2" name="line2" defaultValue={defaults.line2} error={errors.line2} autoComplete="address-line2" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City" name="city" defaultValue={defaults.city} error={errors.city} autoComplete="address-level2" />
            <Field label="State / Region" name="state" defaultValue={defaults.state} error={errors.state} autoComplete="address-level1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Postal code" name="postal_code" defaultValue={defaults.postal_code} error={errors.postal_code} autoComplete="postal-code" />
            <label className="block">
              <span className="field-label">Country</span>
              <select name="country" defaultValue={defaults.country} className="field">
                {["US", "CA", "GB", "AU", "DE", "FR", "NL", "SE", "JP", "NZ", "TH"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Field label="Phone (for the carrier)" name="phone" defaultValue={defaults.phone} error={errors.phone} autoComplete="tel" />
          <label className="block">
            <span className="field-label">Notes for us (optional)</span>
            <textarea name="notes" maxLength={1000} rows={2} className="field-textarea min-h-16" placeholder="Anything we should know" />
          </label>
        </section>

        <section className="panel space-y-3 p-4">
          <p className="label-tech">Order</p>
          <label className="block">
            <span className="field-label">Quantity</span>
            <input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} className="field" />
          </label>
          {spec && (
            <dl className="space-y-1 border-t border-line pt-3 text-sm">
              <Row k={`${qty} × $${(unit / 100).toFixed(2)}`} v={`$${(subtotal / 100).toFixed(2)}`} />
              <Row k="Shipping" v={shipping === 0 ? "Free" : `$${(shipping / 100).toFixed(2)}`} />
              <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold uppercase">
                <dt>Total</dt>
                <dd>${((subtotal + shipping) / 100).toFixed(2)}</dd>
              </div>
            </dl>
          )}
          <p className="text-xs text-muted-foreground">3+ save 10%, 10+ save 20%. Free shipping over $50. Tax is not added at this time.</p>
        </section>

        <section className="panel space-y-3 p-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="proof_approved" checked={approved} onChange={(e) => setApproved(e.target.checked)} required className="mt-0.5 size-5 shrink-0 accent-[#ff2d7a]" />
            <span>I have reviewed and approve this BuildTag design for production. I understand the artwork is frozen exactly as shown.</span>
          </label>
          {errors.proof_approved && <p className="field-error">{errors.proof_approved}</p>}
          {state && !state.ok && !state.fieldErrors && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <button type="submit" className="btn-signal w-full" disabled={pending || !orderable || !approved}>
            {pending ? "Placing order…" : "Approve proof & continue to payment"}
          </button>
          {!orderable && <p className="text-xs text-neon-amber">{qrFailed ? "The QR failed validation, so this proof cannot be ordered." : "This material is preview-only, so it cannot be ordered yet."}</p>}
        </section>
      </form>
    </div>
  );
}

function Field({ label, name, defaultValue, error, autoComplete }: { label: string; name: string; defaultValue: string; error?: string; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input name={name} defaultValue={defaultValue} autoComplete={autoComplete} className="field" aria-invalid={Boolean(error)} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

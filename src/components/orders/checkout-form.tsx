"use client";

import { useActionState, useState } from "react";

import { placeOrderAction } from "@/lib/actions/orders";
import type { PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

interface Defaults {
  name: string;
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

export function CheckoutForm({ snapshot, spec, initialQuantity, email, defaults }: { snapshot: ProductionSnapshotRow; spec: PrintSpecificationRow | null; initialQuantity: number; email: string; defaults: Defaults }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(placeOrderAction, null);
  const [qty, setQty] = useState(initialQuantity);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const orderable = Boolean(spec && spec.available && spec.provider_sku && snapshot.validation_status !== "failed");
  const unit = spec ? unitPrice(spec.price_cents, qty) : 0;
  const subtotal = unit * qty;
  const shipping = subtotal >= 5000 ? 0 : 599;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="snapshot_id" value={snapshot.id} />
        <input type="hidden" name="quantity" value={qty} />
        <input type="hidden" name="email" value={email} />
        <h2 className="text-2xl">Shipping</h2>
        <Field label="Full name" name="name" defaultValue={defaults.name} error={errors.name} autoComplete="name" />
        <Field label="Address line 1" name="line1" defaultValue={defaults.line1} error={errors.line1} autoComplete="address-line1" />
        <Field label="Address line 2" name="line2" defaultValue={defaults.line2} error={errors.line2} autoComplete="address-line2" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" defaultValue={defaults.city} error={errors.city} autoComplete="address-level2" />
          <Field label="State / Region" name="state" defaultValue={defaults.state} error={errors.state} autoComplete="address-level1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Postal code" name="postal_code" defaultValue={defaults.postal_code} error={errors.postal_code} autoComplete="postal-code" />
          <label className="block">
            <span className="field-label">Country</span>
            <select name="country" defaultValue={defaults.country} className="field">
              {["US", "CA", "GB", "AU", "DE", "FR", "NL", "SE", "JP", "NZ"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Field label="Phone (for the carrier)" name="phone" defaultValue={defaults.phone} error={errors.phone} autoComplete="tel" />
        {state && !state.ok && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn-signal w-full sm:w-auto" disabled={pending || !orderable}>
          {pending ? "Placing order…" : "Place order"}
        </button>
        {!orderable && <p className="text-xs text-neon-amber">This material is preview-only or the artwork failed validation, so it cannot be ordered yet.</p>}
      </form>

      <aside className="panel h-fit p-4">
        <p className="label-tech">Your BuildTag</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/snapshots/${snapshot.id}/artwork?format=png`} alt="Approved BuildTag proof" className="mt-2 w-full rounded-md bg-[#100d1f] object-contain" />
        <dl className="mt-3 space-y-1 text-sm">
          <Row k="Size" v={`${Number(snapshot.width)} × ${Number(snapshot.height)} ${snapshot.units}`} />
          <Row k="Material" v={spec?.name ?? snapshot.material} />
          <Row k="Validation" v={snapshot.validation_status === "passed" ? "Decoder passed" : snapshot.validation_status} />
          <Row k="QR destination" v={<span className="break-all font-mono text-xs">{snapshot.qr_destination_at_order}</span>} />
        </dl>
        <label className="mt-4 block">
          <span className="field-label">Quantity</span>
          <input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} className="field" />
        </label>
        {spec && (
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <Row k={`${qty} × $${(unit / 100).toFixed(2)}`} v={`$${(subtotal / 100).toFixed(2)}`} />
            <Row k="Shipping" v={shipping === 0 ? "Free" : `$${(shipping / 100).toFixed(2)}`} />
            <Row k="Tax" v="Calculated at payment" />
            <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-bold uppercase">
              <dt>Total</dt>
              <dd>${((subtotal + shipping) / 100).toFixed(2)}</dd>
            </div>
          </dl>
        )}
      </aside>
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

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

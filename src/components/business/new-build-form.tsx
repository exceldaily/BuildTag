"use client";

import { useActionState } from "react";

import { createOrgBuildAction } from "@/lib/actions/business";
import type { ActionResult } from "@/lib/validation/common";

import { Field, FormError } from "./field";

const currentYear = new Date().getFullYear();

const ROLES = [
  { value: "builder", label: "We built it", checked: true },
  { value: "installer", label: "We installed parts" },
  { value: "tuner", label: "We tuned it" },
  { value: "dealer", label: "We sold it" },
] as const;

export function NewBuildForm({ orgId, hasCrew, crewName }: { orgId: string; hasCrew: boolean; crewName: string | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createOrgBuildAction.bind(null, orgId), null);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-8" noValidate>
      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold uppercase">Vehicle</legend>
        <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr]">
          <Field label="Year" htmlFor="year" error={e.year}>
            <input id="year" name="year" type="number" inputMode="numeric" min={1900} max={currentYear + 2} placeholder={String(currentYear)} className="field" />
          </Field>
          <Field label="Make" htmlFor="make" error={e.make}>
            <input id="make" name="make" required maxLength={60} placeholder="Harley-Davidson" autoComplete="off" className="field" />
          </Field>
          <Field label="Model" htmlFor="model" error={e.model}>
            <input id="model" name="model" required maxLength={60} placeholder="Road Glide" autoComplete="off" className="field" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trim" htmlFor="trim" optional>
            <input id="trim" name="trim" maxLength={60} autoComplete="off" className="field" />
          </Field>
          <Field label="Nickname" htmlFor="nickname" optional hint="Shows big on the build page. The customer can change it later.">
            <input id="nickname" name="nickname" maxLength={40} autoComplete="off" className="field" />
          </Field>
        </div>
        <Field label="About the build" htmlFor="description" optional>
          <textarea id="description" name="description" maxLength={3000} rows={3} className="field-textarea min-h-20" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="location_text" optional>
            <input id="location_text" name="location_text" maxLength={80} className="field" />
          </Field>
          <Field label="Visibility" htmlFor="visibility">
            <select id="visibility" name="visibility" defaultValue="public" className="field">
              <option value="public">Public</option>
              <option value="unlisted">Unlisted (link only)</option>
              <option value="private">Private until claimed</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-display text-xl font-bold uppercase">Your role</legend>
        <p className="text-sm text-muted-foreground">Shown on the public page as build credit. Pick all that apply.</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <label key={r.value} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm has-[:checked]:border-signal/60 has-[:checked]:bg-signal/10">
              <input type="checkbox" name="roles" value={r.value} defaultChecked={"checked" in r && r.checked} className="size-4 accent-[#ff2d7a]" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold uppercase">Customer (private)</legend>
        <p className="text-sm text-muted-foreground">Only your team sees this. It&apos;s never on the public page, and the customer&apos;s account stays theirs after they claim.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="customer_name" optional>
            <input id="customer_name" name="customer_name" maxLength={120} autoComplete="off" className="field" />
          </Field>
          <Field label="Email" htmlFor="customer_email" error={e.customer_email} optional>
            <input id="customer_email" name="customer_email" type="email" autoComplete="off" className="field" />
          </Field>
          <Field label="Phone" htmlFor="customer_phone" optional>
            <input id="customer_phone" name="customer_phone" type="tel" maxLength={40} autoComplete="off" className="field" />
          </Field>
        </div>
        <Field label="Notes" htmlFor="notes" optional>
          <textarea id="notes" name="notes" maxLength={2000} rows={2} placeholder="Delivery date, work order, anything your team needs" className="field-textarea min-h-16" />
        </Field>
      </fieldset>

      {hasCrew ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="add_to_crew" defaultChecked className="size-4 accent-[#ff2d7a]" />
          Add to {crewName ?? "your crew"}
        </label>
      ) : (
        <input type="hidden" name="add_to_crew" value="false" />
      )}

      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <button type="submit" className="btn-signal w-full sm:w-auto sm:px-10" disabled={pending}>
        {pending ? "Creating…" : "Create build and add photos"}
      </button>
    </form>
  );
}

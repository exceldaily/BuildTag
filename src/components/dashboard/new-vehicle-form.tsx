"use client";

import { useActionState } from "react";

import { createVehicleAction } from "@/lib/actions/vehicles";
import type { ActionResult } from "@/lib/validation/common";

const currentYear = new Date().getFullYear();

export function NewVehicleForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createVehicleAction, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div>
          <label htmlFor="year" className="field-label">
            Year
          </label>
          <input id="year" name="year" type="number" inputMode="numeric" min={1900} max={currentYear + 2} placeholder="2022" className="field" aria-invalid={Boolean(errors.year)} />
          {errors.year && <p className="field-error">{errors.year}</p>}
        </div>
        <div>
          <label htmlFor="make" className="field-label">
            Make
          </label>
          <input id="make" name="make" required maxLength={60} placeholder="Toyota" autoComplete="off" className="field" aria-invalid={Boolean(errors.make)} />
          {errors.make && <p className="field-error">{errors.make}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="model" className="field-label">
            Model
          </label>
          <input id="model" name="model" required maxLength={60} placeholder="GR Supra" autoComplete="off" className="field" aria-invalid={Boolean(errors.model)} />
          {errors.model && <p className="field-error">{errors.model}</p>}
        </div>
        <div>
          <label htmlFor="trim" className="field-label">
            Trim <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input id="trim" name="trim" maxLength={60} placeholder="3.0 Premium" autoComplete="off" className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="nickname" className="field-label">
          Nickname <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input id="nickname" name="nickname" maxLength={40} placeholder="GHOST" autoComplete="off" className="field" />
        <p className="mt-1 text-xs text-muted-foreground">Shows big on the build page and can go on your decal.</p>
      </div>
      {state && !state.ok && !state.fieldErrors && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-signal w-full sm:w-auto" disabled={pending}>
        {pending ? "Creating…" : "Create vehicle"}
      </button>
    </form>
  );
}

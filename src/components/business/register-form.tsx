"use client";

import { useActionState } from "react";

import { registerOrganizationAction } from "@/lib/actions/business";
import { ORGANIZATION_TYPES } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

import { Field, FormError } from "./field";

export function RegisterBusinessForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(registerOrganizationAction, null);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="name" error={e.name}>
          <input id="name" name="name" required maxLength={80} placeholder="Blackline Performance" className="field" aria-invalid={Boolean(e.name)} />
        </Field>
        <Field label="Type" htmlFor="organization_type" error={e.organization_type}>
          <select id="organization_type" name="organization_type" defaultValue="custom_shop" className="field">
            {ORGANIZATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website" htmlFor="website_url" error={e.website_url} optional>
          <input id="website_url" name="website_url" type="url" inputMode="url" placeholder="https://" className="field" />
        </Field>
        <Field label="Business email" htmlFor="email" error={e.email} optional>
          <input id="email" name="email" type="email" className="field" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_100px]">
        <Field label="City" htmlFor="city" optional>
          <input id="city" name="city" maxLength={80} className="field" />
        </Field>
        <Field label="State / region" htmlFor="region" optional>
          <input id="region" name="region" maxLength={80} className="field" />
        </Field>
        <Field label="Country" htmlFor="country" error={e.country}>
          <input id="country" name="country" defaultValue="US" maxLength={2} className="field uppercase" />
        </Field>
      </div>
      <Field label="Phone" htmlFor="phone" optional>
        <input id="phone" name="phone" type="tel" maxLength={40} className="field" />
      </Field>
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <button type="submit" className="btn-signal w-full sm:w-auto" disabled={pending}>
        {pending ? "Registering…" : "Register business"}
      </button>
    </form>
  );
}

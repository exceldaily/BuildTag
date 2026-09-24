"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOrganizationAction } from "@/lib/actions/business";
import { ORGANIZATION_TYPES, type OrganizationRow } from "@/lib/types";

import { Field } from "./field";

export function OrgProfileForm({ org }: { org: OrganizationRow }) {
  const [pending, start] = useTransition();
  const [e, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const form = new FormData(ev.currentTarget);
        start(async () => {
          const res = await updateOrganizationAction(org.id, form);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          setErrors({});
          toast.success("Profile saved");
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="o-name" error={e.name}>
          <input id="o-name" name="name" defaultValue={org.name} maxLength={80} className="field" />
        </Field>
        <Field label="Type" htmlFor="o-type">
          <select id="o-type" name="organization_type" defaultValue={org.organization_type} className="field">
            {ORGANIZATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Tagline" htmlFor="o-tagline" optional error={e.tagline}>
        <input id="o-tagline" name="tagline" defaultValue={org.tagline} maxLength={140} placeholder="Custom baggers and performance builds" className="field" />
      </Field>
      <Field label="About" htmlFor="o-description" optional>
        <textarea id="o-description" name="description" defaultValue={org.description} maxLength={1000} rows={4} className="field-textarea min-h-24" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Logo URL" htmlFor="o-logo" optional error={e.logo_url} hint="Square image works best.">
          <input id="o-logo" name="logo_url" type="url" defaultValue={org.logo_url ?? ""} placeholder="https://" className="field" />
        </Field>
        <Field label="Website" htmlFor="o-web" optional error={e.website_url}>
          <input id="o-web" name="website_url" type="url" defaultValue={org.website_url ?? ""} placeholder="https://" className="field" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Public email" htmlFor="o-email" optional error={e.email}>
          <input id="o-email" name="email" type="email" defaultValue={org.email} className="field" />
        </Field>
        <Field label="Phone" htmlFor="o-phone" optional>
          <input id="o-phone" name="phone" type="tel" defaultValue={org.phone} maxLength={40} className="field" />
        </Field>
        <Field label="Instagram" htmlFor="o-ig" optional>
          <input id="o-ig" name="instagram_handle" defaultValue={org.instagram_handle ?? ""} placeholder="@handle" className="field" />
        </Field>
      </div>
      <Field label="Street address" htmlFor="o-addr" optional>
        <input id="o-addr" name="address_line1" defaultValue={org.address_line1} maxLength={200} className="field" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px_90px]">
        <Field label="City" htmlFor="o-city" optional>
          <input id="o-city" name="city" defaultValue={org.city} maxLength={80} className="field" />
        </Field>
        <Field label="State / region" htmlFor="o-region" optional>
          <input id="o-region" name="region" defaultValue={org.region} maxLength={80} className="field" />
        </Field>
        <Field label="Postal code" htmlFor="o-postal" optional>
          <input id="o-postal" name="postal_code" defaultValue={org.postal_code} maxLength={20} className="field" />
        </Field>
        <Field label="Country" htmlFor="o-country" error={e.country}>
          <input id="o-country" name="country" defaultValue={org.country} maxLength={2} className="field uppercase" />
        </Field>
      </div>
      <Field label="Location label" htmlFor="o-loc" optional hint="Short line shown on build pages, e.g. Austin, TX">
        <input id="o-loc" name="location_text" defaultValue={org.location_text} maxLength={80} className="field" />
      </Field>
      <button type="submit" className="btn-signal" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

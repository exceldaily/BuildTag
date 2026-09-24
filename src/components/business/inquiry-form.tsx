"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitBusinessInquiryAction } from "@/lib/actions/business-inquiry";
import { BUSINESS_INTEREST_LABEL, BUSINESS_INTEREST_VALUES, INQUIRY_BUSINESS_TYPES, INQUIRY_INDUSTRIES } from "@/lib/validation/business";
import type { ActionResult } from "@/lib/validation/common";

import { Field, FormError } from "./field";

export function InquiryForm({ defaultInterest }: { defaultInterest?: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitBusinessInquiryAction, null);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  if (state?.ok) {
    return (
      <div className="py-4">
        <p className="eyebrow">Sent</p>
        <h2 className="mt-2 text-3xl">Thanks. We&apos;ll be in touch.</h2>
        <p className="mt-3 text-sm text-muted-foreground">We read every inquiry and usually reply within a couple of business days.</p>
        <Link href="/business" className="btn-ghost mt-6">
          Back to BuildTags Business
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="i-name" error={e.name}>
          <input id="i-name" name="name" required maxLength={120} autoComplete="name" className="field" />
        </Field>
        <Field label="Business name" htmlFor="i-business" error={e.business_name}>
          <input id="i-business" name="business_name" required maxLength={160} autoComplete="organization" className="field" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="i-email" error={e.email}>
          <input id="i-email" name="email" type="email" required autoComplete="email" className="field" />
        </Field>
        <Field label="Phone" htmlFor="i-phone" optional>
          <input id="i-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className="field" />
        </Field>
      </div>
      <Field label="Website" htmlFor="i-web" optional error={e.website}>
        <input id="i-web" name="website" inputMode="url" maxLength={300} placeholder="yourshop.com" className="field" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business type" htmlFor="i-type" error={e.business_type}>
          <select id="i-type" name="business_type" defaultValue="custom_shop" className="field">
            {INQUIRY_BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vehicles you work on" htmlFor="i-industry" optional>
          <select id="i-industry" name="industry" defaultValue="" className="field">
            <option value="">Choose</option>
            {INQUIRY_INDUSTRIES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Locations" htmlFor="i-loc" optional>
          <select id="i-loc" name="location_count" defaultValue="" className="field">
            <option value="">Choose</option>
            {["1", "2-5", "6-20", "21+"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Builds per month" htmlFor="i-builds" optional>
          <select id="i-builds" name="builds_per_month" defaultValue="" className="field">
            <option value="">Choose</option>
            {["1-5", "6-20", "21-50", "51+"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="field-label">Interested in</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {BUSINESS_INTEREST_VALUES.map((v) => (
            <label key={v} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm has-[:checked]:border-signal/60 has-[:checked]:bg-signal/10">
              <input type="checkbox" name="interests" value={v} defaultChecked={v === defaultInterest} className="size-4 accent-[#ff2d7a]" />
              {BUSINESS_INTEREST_LABEL[v]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Anything else" htmlFor="i-msg" optional>
        <textarea id="i-msg" name="message" maxLength={4000} rows={4} placeholder="What you build, how many vehicles, what you'd want customers to get" className="field-textarea min-h-24" />
      </Field>
      {/* honeypot */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="i-fax">Company fax</label>
        <input id="i-fax" name="company_fax" tabIndex={-1} autoComplete="off" />
      </div>
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <button type="submit" className="btn-signal w-full sm:w-auto sm:px-10" disabled={pending}>
        {pending ? "Sending…" : "Send inquiry"}
      </button>
      <p className="text-xs text-muted-foreground">
        We use this only to reply to you. See our{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

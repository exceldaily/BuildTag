"use client";

import { useActionState, useState } from "react";

import { signUpAction } from "@/lib/actions/auth";
import { LOCALES, LOCALE_LABEL, REGIONS, type Locale, type RegionCode } from "@/lib/i18n";
import type { ActionResult } from "@/lib/validation/common";

export function SignupForm({ plan, next, defaultLocale = "en", defaultRegion = "US" }: { plan?: "pro"; next?: string; defaultLocale?: Locale; defaultRegion?: RegionCode }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signUpAction, null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const errors: Record<string, string | undefined> = { ...(state && !state.ok ? (state.fieldErrors ?? {}) : {}) };
  if (termsError) errors.accept_terms = termsError;

  return (
    <form
      action={action}
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        // Catch the unticked box before submitting so nothing typed is lost.
        // The server action enforces the same rule.
        const box = e.currentTarget.elements.namedItem("accept_terms") as HTMLInputElement | null;
        if (!box?.checked) {
          e.preventDefault();
          setTermsError("Please agree to the Terms of Service and Privacy Policy to create an account.");
          box?.focus();
        } else {
          setTermsError(null);
        }
      }}
    >
      {plan && <input type="hidden" name="plan" value={plan} />}
      {next && <input type="hidden" name="next" value={next} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="display_name" className="field-label">
            Name
          </label>
          <input id="display_name" name="display_name" autoComplete="name" required maxLength={60} className="field" aria-invalid={Boolean(errors.display_name)} />
          {errors.display_name && <p className="field-error">{errors.display_name}</p>}
        </div>
        <div>
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">@</span>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              pattern="[a-z0-9_]{3,30}"
              maxLength={30}
              className="field pl-8"
              aria-invalid={Boolean(errors.username)}
            />
          </div>
          {errors.username ? <p className="field-error">{errors.username}</p> : <p className="mt-1 text-xs text-muted-foreground">Letters, numbers, underscores.</p>}
        </div>
      </div>
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" aria-invalid={Boolean(errors.email)} />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field" aria-invalid={Boolean(errors.password)} />
        {errors.password ? <p className="field-error">{errors.password}</p> : <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="locale" className="field-label">
            Language
          </label>
          <select id="locale" name="locale" defaultValue={defaultLocale} className="field">
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABEL[l]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Menus and your build page in this language.</p>
        </div>
        <div>
          <label htmlFor="region" className="field-label">
            Region
          </label>
          <select id="region" name="region" defaultValue={defaultRegion} className="field">
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Sets default units and formats.</p>
        </div>
      </div>
      <div>
        <label htmlFor="accept_terms" className="flex cursor-pointer items-start gap-3 rounded-sm border border-line p-3 text-sm leading-relaxed text-foreground/85">
          <input
            id="accept_terms"
            name="accept_terms"
            type="checkbox"
            required
            className="mt-0.5 size-5 shrink-0 accent-[var(--signal)]"
            aria-invalid={Boolean(errors.accept_terms)}
            onChange={(e) => e.target.checked && setTermsError(null)}
            aria-describedby={errors.accept_terms ? "accept_terms_error" : undefined}
          />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener" className="text-foreground underline underline-offset-2">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener" className="text-foreground underline underline-offset-2">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors.accept_terms && (
          <p id="accept_terms_error" className="field-error">
            {errors.accept_terms}
          </p>
        )}
      </div>
      {state && !state.ok && !state.fieldErrors && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-signal w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

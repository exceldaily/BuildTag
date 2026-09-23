"use client";

import { useActionState } from "react";

import { signUpAction } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/validation/common";

export function SignupForm({ plan }: { plan?: "pro" }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signUpAction, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-4" noValidate>
      {plan && <input type="hidden" name="plan" value={plan} />}
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
      {state && !state.ok && !state.fieldErrors && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-signal w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </form>
  );
}

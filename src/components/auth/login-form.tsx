"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/validation/common";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signInAction, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" aria-invalid={Boolean(errors.email)} />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot?
          </Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" aria-invalid={Boolean(errors.password)} />
        {errors.password && <p className="field-error">{errors.password}</p>}
      </div>
      {state && !state.ok && !state.fieldErrors && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-signal w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

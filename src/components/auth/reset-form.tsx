"use client";

import { useActionState } from "react";

import { sendPasswordResetAction } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/validation/common";

export function ResetForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(sendPasswordResetAction, null);

  if (state?.ok) {
    return <p className="text-sm text-muted-foreground">If that email has an account, a reset link is on its way.</p>;
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-signal w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

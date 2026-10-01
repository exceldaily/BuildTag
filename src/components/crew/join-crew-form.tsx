"use client";

import { useActionState } from "react";
import { Users } from "lucide-react";

import { joinCrewAction } from "@/lib/actions/crews";
import type { ActionResult } from "@/lib/validation/common";

/** One-button join for a crew invite link. */
export function JoinCrewForm({ code, crewName }: { code: string; crewName: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(joinCrewAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending} className="btn-signal">
        <Users className="size-4" aria-hidden="true" />
        {pending ? "Joining…" : `Join ${crewName}`}
      </button>
      {state && !state.ok && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

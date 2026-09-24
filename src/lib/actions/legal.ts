"use server";

import { redirect } from "next/navigation";

import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal/config";
import { isChecked } from "@/lib/legal/consent";
import { recordAcceptance } from "@/lib/legal/status";
import { requireUser } from "@/lib/supabase/server";

function safeNext(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

/** Records acceptance of the current Terms and Privacy Policy (existing accounts, or after a material update). */
export async function acceptCurrentPoliciesAction(form: FormData): Promise<void> {
  const next = safeNext(form.get("next"));
  const { client } = await requireUser(`/legal/accept?next=${encodeURIComponent(next)}`);
  if (!isChecked(form.get("accept_terms"))) {
    redirect(`/legal/accept?next=${encodeURIComponent(next)}&error=required`);
  }
  const err =
    (await recordAcceptance(client, { type: "terms", version: TERMS_VERSION, context: "reaccept" })) ??
    (await recordAcceptance(client, { type: "privacy", version: PRIVACY_VERSION, context: "reaccept" }));
  if (err) {
    redirect(`/legal/accept?next=${encodeURIComponent(next)}&error=save`);
  }
  redirect(next);
}

import "server-only";

import { headers } from "next/headers";

import type { BuildTagClient } from "@/lib/supabase/server";
import type { Json, LegalDocumentType } from "@/lib/types";

import type { AcceptanceContext } from "./consent";
import { LEGAL_DOCS } from "./config";

/** Current Terms/Privacy acceptance of the signed-in user. */
export interface LegalStatus {
  terms: string | null;
  privacy: string | null;
  /** True when both accepted versions are at least the required versions. */
  current: boolean;
}

export async function getLegalStatus(client: BuildTagClient): Promise<LegalStatus> {
  const { data, error } = await client.rpc("my_legal_status");
  // Fail open on a read error: never lock people out of their garage because
  // the status check itself broke. The error is logged for follow-up.
  if (error) {
    console.error("my_legal_status failed", error.message);
    return { terms: null, privacy: null, current: true };
  }
  const rows = Array.isArray(data) ? data : [];
  const terms = rows.find((r) => r.document_type === "terms")?.document_version ?? null;
  const privacy = rows.find((r) => r.document_type === "privacy")?.document_version ?? null;
  const current = Boolean(terms && privacy && terms >= LEGAL_DOCS.terms.requiredVersion && privacy >= LEGAL_DOCS.privacy.requiredVersion);
  return { terms, privacy, current };
}

async function userAgent(): Promise<string | null> {
  try {
    return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  } catch {
    return null;
  }
}

export interface AcceptanceInput {
  type: LegalDocumentType;
  version: string;
  context: AcceptanceContext;
  subjectType?: "order" | "vehicle" | "organization" | "snapshot";
  subjectId?: string | null;
  related?: Record<string, string | number | boolean | null>;
}

/** Append one acceptance row for the signed-in user. Returns an error message on failure. */
export async function recordAcceptance(client: BuildTagClient, input: AcceptanceInput): Promise<string | null> {
  const { error } = await client.rpc("record_legal_acceptance", {
    p_document_type: input.type,
    p_document_version: input.version,
    p_context: input.context,
    p_subject_type: input.subjectType ?? null,
    p_subject_id: input.subjectId ?? null,
    p_related: (input.related ?? {}) as Json,
    p_user_agent: await userAgent(),
  });
  if (error) {
    console.error("record_legal_acceptance failed", input.type, input.context, error.message);
    return error.message;
  }
  return null;
}

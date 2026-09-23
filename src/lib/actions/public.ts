"use server";

import { getNetworkKey, getVisitorKey } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/analytics/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formToObject, type ActionResult } from "@/lib/validation/common";
import { reportSchema } from "@/lib/validation/profile";

/** Anonymous report submission from the public build page. */
export async function submitReportAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Pick a reason and try again." };

  const network = await getNetworkKey();
  if (!rateLimit(`report:${network}`, 5, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many reports from this network. Try again later." };
  }

  const visitorKey = (await getVisitorKey({ create: true })) ?? network;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("submit_report", {
    p_slug: parsed.data.slug,
    p_reason: parsed.data.reason,
    p_description: parsed.data.description,
    p_reporter_key: visitorKey,
  });
  if (error) return { ok: false, error: "Could not submit the report." };
  if (data === false) return { ok: false, error: "Report limit reached for today." };
  return { ok: true, data: undefined };
}

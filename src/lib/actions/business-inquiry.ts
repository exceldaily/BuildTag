"use server";

import { getNetworkKey } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/analytics/rate-limit";
import { adminNotificationAddress, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { adminEmails } from "@/lib/server-env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types";
import { BUSINESS_INTEREST_LABEL, businessInquirySchema, INQUIRY_BUSINESS_TYPES } from "@/lib/validation/business";
import { fieldErrors, formToObject, type ActionResult } from "@/lib/validation/common";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Public B2B lead form. The inquiry is saved first; the admin email is best
 * effort, so a mail outage never loses a lead (it's always in
 * /admin/business-inquiries).
 */
export async function submitBusinessInquiryAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const raw = { ...formToObject(form), interests: form.getAll("interests").map(String) };
  const parsed = businessInquirySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { company_fax, ...inquiry } = parsed.data;
  // honeypot filled: act like it worked, store nothing
  if (company_fax) return { ok: true, data: undefined };

  const network = await getNetworkKey();
  if (!rateLimit(`inquiry:${network}`, 5, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many inquiries from this network. Try again later or email us." };
  }

  const client = await createServerSupabaseClient();
  const { data: id, error } = await client.rpc("submit_business_inquiry", { p: inquiry as unknown as Json, p_submitter_key: network });
  if (error || !id) return { ok: false, error: error?.message.includes("Too many") ? error.message : "Could not send your inquiry. Try again, or email us." };

  const to = adminNotificationAddress() ?? adminEmails()[0] ?? null;
  if (to) {
    const type = INQUIRY_BUSINESS_TYPES.find((t) => t.value === inquiry.business_type)?.label ?? inquiry.business_type;
    const interests = inquiry.interests.map((i) => BUSINESS_INTEREST_LABEL[i]).join(", ") || "None selected";
    const rows: [string, string][] = [
      ["Name", inquiry.name],
      ["Business", inquiry.business_name],
      ["Email", inquiry.email],
      ["Phone", inquiry.phone || "-"],
      ["Website", inquiry.website || "-"],
      ["Type", type],
      ["Industry", inquiry.industry || "-"],
      ["Locations", inquiry.location_count || "-"],
      ["Builds per month", inquiry.builds_per_month || "-"],
      ["Interested in", interests],
    ];
    const admin = `${siteUrl()}/admin/business-inquiries`;
    const result = await sendEmail({
      to,
      subject: `🔥 New BuildTags Business Inquiry: ${inquiry.business_name}`,
      text: `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nMessage:\n${inquiry.message || "-"}\n\nOpen: ${admin}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;color:#111">
<h2 style="margin:0 0 12px">New BuildTags Business inquiry</h2>
<table style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join("")}</table>
<p style="font-size:14px;white-space:pre-wrap;border-left:3px solid #ddd;padding-left:12px">${esc(inquiry.message || "-")}</p>
<p><a href="${admin}">Open in admin</a></p>
</div>`,
    });
    if (!result.ok) console.error("[business-inquiry] admin email failed; inquiry saved", id, result.error);
  }
  return { ok: true, data: undefined };
}

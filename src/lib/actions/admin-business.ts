"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/supabase/server";
import type { BusinessInquiryStatus, OrganizationStatus, OrganizationType, VerificationStatus } from "@/lib/types";
import { uuid, type ActionResult } from "@/lib/validation/common";
import { ORGANIZATION_TYPE_VALUES } from "@/lib/validation/business";

const inquiryStatus = z.enum(["new", "contacted", "qualified", "pilot", "customer", "closed", "spam"]);

export async function updateInquiryAction(id: string, input: { status?: BusinessInquiryStatus; notes?: string }): Promise<ActionResult> {
  const parsed = z.object({ id: uuid, status: inquiryStatus.optional(), notes: z.string().max(8000).optional() }).safeParse({ id, ...input });
  if (!parsed.success) return { ok: false, error: "Invalid update." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_update_business_inquiry", { p_id: id, p_status: parsed.data.status ?? null, p_notes: parsed.data.notes ?? null });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/business-inquiries");
  return { ok: true, data: undefined };
}

export async function setOrganizationAction(
  orgId: string,
  input: { status?: OrganizationStatus; verified?: VerificationStatus; type?: OrganizationType },
): Promise<ActionResult> {
  const parsed = z
    .object({
      orgId: uuid,
      status: z.enum(["pending", "active", "suspended"]).optional(),
      verified: z.enum(["unverified", "pending", "verified", "rejected"]).optional(),
      type: z.enum(ORGANIZATION_TYPE_VALUES).optional(),
    })
    .safeParse({ orgId, ...input });
  if (!parsed.success) return { ok: false, error: "Invalid update." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_set_organization", {
    p_org: orgId,
    p_status: parsed.data.status ?? null,
    p_verified: parsed.data.verified ?? null,
    p_type: parsed.data.type ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/organizations");
  return { ok: true, data: undefined };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/supabase/server";
import type { BusinessInquiryStatus, Json, OrganizationStatus, OrganizationType, OrgMemberRole, VerificationStatus } from "@/lib/types";
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

const orgRole = z.enum(["owner", "admin", "manager", "staff"]);
/** Username (with or without @) or an email address. */
const memberIdentifier = z.string().trim().min(2, "Enter a username or email.").max(200);

const adminCreateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(80),
  organization_type: z.enum(ORGANIZATION_TYPE_VALUES),
  owner: z.union([memberIdentifier, z.literal("")]).default(""),
  status: z.enum(["pending", "active", "suspended"]).default("active"),
  verified: z.enum(["unverified", "pending", "verified", "rejected"]).default("unverified"),
  add_self: z.union([orgRole, z.literal("")]).default(""),
  email: z.union([z.string().trim().email("Enter a valid email.").max(200), z.literal("")]).default(""),
  phone: z.string().trim().max(40).default(""),
  city: z.string().trim().max(80).default(""),
  region: z.string().trim().max(80).default(""),
});

export type AdminCreateOrganizationInput = z.input<typeof adminCreateOrganizationSchema>;

/** Creates a business on someone's behalf (or a sandbox for testing). Owner may be a username, an existing email, or a new email (invite). */
export async function adminCreateOrganizationAction(
  input: AdminCreateOrganizationInput,
): Promise<ActionResult<{ id: string; slug: string; owner: "added" | "invited" | null }>> {
  const parsed = adminCreateOrganizationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  if (!d.owner && !d.add_self) return { ok: false, error: "Name an owner, or add yourself to the business." };
  const { client } = await requireAdmin();
  const { data, error } = await client.rpc("admin_create_organization", {
    p_name: d.name,
    p_type: d.organization_type,
    p_owner: d.owner,
    p_status: d.status,
    p_verified: d.verified,
    p_details: { email: d.email, phone: d.phone, city: d.city, region: d.region, location_text: [d.city, d.region].filter(Boolean).join(", ") } as unknown as Json,
    p_add_self: d.add_self || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/organizations");
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: data as unknown as { id: string; slug: string; owner: "added" | "invited" | null } };
}

export async function adminAddOrgMemberAction(orgId: string, identifier: string, role: OrgMemberRole): Promise<ActionResult<"added" | "invited">> {
  const parsed = z.object({ orgId: uuid, identifier: memberIdentifier, role: orgRole }).safeParse({ orgId, identifier, role });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid member." };
  const { client } = await requireAdmin();
  const { data, error } = await client.rpc("admin_add_org_member", { p_org: orgId, p_identifier: parsed.data.identifier, p_role: role });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: data as "added" | "invited" };
}

export async function adminSetOrgMemberAction(orgId: string, userId: string, input: { role?: OrgMemberRole; remove?: boolean }): Promise<ActionResult> {
  const parsed = z.object({ orgId: uuid, userId: uuid, role: orgRole.optional(), remove: z.boolean().optional() }).safeParse({ orgId, userId, ...input });
  if (!parsed.success) return { ok: false, error: "Invalid update." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_set_org_member", {
    p_org: orgId,
    p_user_id: userId,
    p_role: parsed.data.role ?? null,
    p_remove: parsed.data.remove ?? false,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: undefined };
}

export async function adminRevokeOrgInviteAction(orgId: string, inviteId: string): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(inviteId).success) return { ok: false, error: "Invalid invite." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_revoke_org_invite", { p_invite_id: inviteId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/organizations/${orgId}`);
  return { ok: true, data: undefined };
}

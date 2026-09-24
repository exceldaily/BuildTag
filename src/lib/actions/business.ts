"use server";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { claimUrl } from "@/lib/claims";
import { ACTIVE_ORG_COOKIE, listMyOrganizations } from "@/lib/db/business";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { requireProfile } from "@/lib/supabase/server";
import type { GeneratedClaim, Json, OrgMemberRole, OrganizationRow } from "@/lib/types";
import {
  claimOptionsSchema,
  customerRecordSchema,
  organizationProfileSchema,
  organizationRegisterSchema,
  orgCrewSchema,
  orgVehicleSchema,
  RELATIONSHIP_ROLE_VALUES,
} from "@/lib/validation/business";
import { fieldErrors, formToObject, uuid, type ActionResult } from "@/lib/validation/common";

/* The database authorizes every call below (org_can_work / is_org_member / RLS). */

function dbError(message: string) {
  if (/forbidden|permission denied|42501/i.test(message)) return "Your role in this business can't do that.";
  return message;
}

async function setActiveOrg(orgId: string) {
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function switchOrganizationAction(orgId: string): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success) return { ok: false, error: "Invalid business." };
  const { client } = await requireProfile();
  const orgs = await listMyOrganizations(client);
  if (!orgs.some((o) => o.id === orgId)) return { ok: false, error: "You're not a member of that business." };
  await setActiveOrg(orgId);
  revalidatePath("/dashboard/business", "layout");
  return { ok: true, data: undefined };
}

export async function registerOrganizationAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = organizationRegisterSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client } = await requireProfile();
  const { name, organization_type, ...details } = parsed.data;
  const { data, error } = await client.rpc("create_organization", { p_name: name, p_type: organization_type, p_details: details as unknown as Json });
  if (error || !data) return { ok: false, error: error ? dbError(error.message) : "Could not register the business." };
  await setActiveOrg((data as OrganizationRow).id);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/business?registered=1");
}

export async function updateOrganizationAction(orgId: string, form: FormData): Promise<ActionResult<OrganizationRow>> {
  if (!uuid.safeParse(orgId).success) return { ok: false, error: "Invalid business." };
  const parsed = organizationProfileSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client } = await requireProfile();
  const { data, error } = await client.from("organizations").update(parsed.data).eq("id", orgId).select("*").maybeSingle();
  if (error) return { ok: false, error: dbError(error.message) };
  if (!data) return { ok: false, error: "Only owners and admins of the business can edit its profile." };
  const org = data as OrganizationRow;
  revalidatePath("/dashboard/business", "layout");
  revalidatePath(`/org/${org.slug}`);
  return { ok: true, data: org };
}

/* ---------------------------------------------------------------------------
 * Builds
 * ------------------------------------------------------------------------- */

export async function createOrgBuildAction(orgId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success) return { ok: false, error: "Invalid business." };
  const parsed = orgVehicleSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const roles = z.array(z.enum(RELATIONSHIP_ROLE_VALUES)).safeParse(form.getAll("roles"));
  const { customer_name, customer_email, customer_phone, notes, add_to_crew, ...vehicle } = parsed.data;
  const { client } = await requireProfile();
  const { data, error } = await client.rpc("org_create_vehicle", {
    p_org: orgId,
    p_vehicle: vehicle as unknown as Json,
    p_roles: roles.success && roles.data.length ? roles.data : ["builder"],
    p_customer: { customer_name, customer_email, customer_phone, notes },
    p_add_to_crew: add_to_crew,
  });
  if (error || !data) return { ok: false, error: error ? dbError(error.message) : "Could not create the build." };
  revalidatePath("/dashboard/business", "layout");
  redirect(`/dashboard/vehicles/${data}/setup/photos`);
}

export async function saveCustomerRecordAction(orgId: string, vehicleId: string, form: FormData): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(vehicleId).success) return { ok: false, error: "Invalid request." };
  const parsed = customerRecordSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client, user } = await requireProfile();
  const { error } = await client
    .from("vehicle_customer_records")
    .upsert({ vehicle_id: vehicleId, organization_id: orgId, ...parsed.data, created_by_user_id: user.id }, { onConflict: "vehicle_id,organization_id" });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath(`/dashboard/business/builds/${vehicleId}`);
  return { ok: true, data: undefined };
}

/* ---------------------------------------------------------------------------
 * Claims. The raw token and code exist only in this response and on the
 * printed card; the database keeps hashes.
 * ------------------------------------------------------------------------- */

export async function generateClaimAction(vehicleId: string, form: FormData): Promise<ActionResult<GeneratedClaim & { url: string }>> {
  if (!uuid.safeParse(vehicleId).success) return { ok: false, error: "Invalid build." };
  const parsed = claimOptionsSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client } = await requireProfile();
  const { data, error } = await client.rpc("generate_vehicle_claim", {
    p_vehicle_id: vehicleId,
    p_expires_in_days: parsed.data.expires_in_days,
    p_recipient_email: parsed.data.recipient_email,
  });
  if (error || !data) return { ok: false, error: error ? dbError(error.message) : "Could not create a claim link." };
  const claim = data as unknown as GeneratedClaim;
  revalidatePath("/dashboard/business", "layout");
  return { ok: true, data: { ...claim, url: claimUrl(siteUrl(), claim.token) } };
}

export async function revokeClaimAction(claimId: string): Promise<ActionResult> {
  if (!uuid.safeParse(claimId).success) return { ok: false, error: "Invalid claim." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("revoke_vehicle_claim", { p_claim_id: claimId });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/dashboard/business", "layout");
  return { ok: true, data: undefined };
}

const inviteSchema = z.object({
  claimId: uuid,
  token: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/),
  email: z.string().trim().toLowerCase().email("Enter the customer's email").max(200),
});

/**
 * Emails the claim link to the customer. The token must hash to the claim the
 * business can see, so this can't be used to send arbitrary links.
 */
export async function sendClaimInviteAction(input: { claimId: string; token: string; email: string }): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  const { client } = await requireProfile();
  const { data: claim } = await client
    .from("vehicle_claims")
    .select("id, token_hash, status, vehicle_id, organization_id, expires_at")
    .eq("id", parsed.data.claimId)
    .maybeSingle();
  const row = claim;
  if (!row || row.status !== "active") return { ok: false, error: "That claim link is no longer active." };
  if (createHash("sha256").update(parsed.data.token, "utf8").digest("hex") !== row.token_hash) return { ok: false, error: "Claim link mismatch." };

  const [{ data: vehicle }, { data: org }] = await Promise.all([
    client.from("vehicles").select("year, make, model, nickname").eq("id", row.vehicle_id).maybeSingle(),
    client.from("organizations").select("name").eq("id", row.organization_id ?? "").maybeSingle(),
  ]);
  const shop = org?.name ?? "Your shop";
  const what = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : "your vehicle";
  const link = claimUrl(siteUrl(), parsed.data.token);
  const expires = row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

  const result = await sendEmail({
    to: parsed.data.email,
    subject: `Your ${what} build is ready to claim`,
    text: `${shop} set up a BuildTag build page for your ${what}.\n\nClaim it here (it's free): ${link}\n\nOnce you claim it, the page is yours: photos, parts and the permanent QR on your vehicle. ${shop} stays credited for the work they did.${expires ? `\n\nThis link works until ${expires}.` : ""}\n\nKeep this link private until you've claimed it.`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
<p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#666">BuildTag</p>
<h1 style="font-size:28px;margin:8px 0 16px">Your build is ready</h1>
<p style="font-size:16px;line-height:1.5">${esc(shop)} set up a BuildTag build page for your ${esc(what)}${vehicle?.nickname ? ` &ldquo;${esc(vehicle.nickname)}&rdquo;` : ""}.</p>
<p style="margin:28px 0"><a href="${link}" style="background:#ff2d7a;color:#fff;text-decoration:none;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:14px 26px;border-radius:6px;display:inline-block">Claim my build</a></p>
<p style="font-size:14px;line-height:1.5;color:#333">Claiming is free. The page, photos, parts list and the permanent QR on your vehicle become yours. ${esc(shop)} stays credited for the work they did.</p>
${expires ? `<p style="font-size:13px;color:#666">This link works until ${expires}.</p>` : ""}
<p style="font-size:12px;color:#666">Keep this link private until you've claimed it. If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all">${link}</span></p>
</div>`,
  });
  if (!result.ok) return { ok: false, error: "Email isn't set up yet. Copy the link or print the claim card instead." };
  await client.rpc("record_claim_invite", { p_claim_id: parsed.data.claimId });
  revalidatePath("/dashboard/business", "layout");
  return { ok: true, data: undefined };
}

/* ---------------------------------------------------------------------------
 * Team
 * ------------------------------------------------------------------------- */

const roleSchema = z.enum(["owner", "admin", "manager", "staff"]);

export async function addTeamMemberAction(orgId: string, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ username: z.string().trim().toLowerCase().max(31).transform((v) => v.replace(/^@/, "")).pipe(z.string().min(3).max(30)), role: roleSchema.exclude(["owner"]) })
    .safeParse(formToObject(form));
  if (!uuid.safeParse(orgId).success || !parsed.success) return { ok: false, error: "Enter a BuildTag username and a role." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("org_add_member", { p_org: orgId, p_username: parsed.data.username, p_role: parsed.data.role });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/dashboard/business/team");
  return { ok: true, data: undefined };
}

export async function setTeamRoleAction(orgId: string, userId: string, role: OrgMemberRole): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(userId).success || !roleSchema.safeParse(role).success) return { ok: false, error: "Invalid request." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("org_set_member_role", { p_org: orgId, p_user_id: userId, p_role: role });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/dashboard/business/team");
  return { ok: true, data: undefined };
}

export async function removeTeamMemberAction(orgId: string, userId: string): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(userId).success) return { ok: false, error: "Invalid request." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("org_remove_member", { p_org: orgId, p_user_id: userId });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/dashboard/business", "layout");
  return { ok: true, data: undefined };
}

/* ---------------------------------------------------------------------------
 * Business crew (community)
 * ------------------------------------------------------------------------- */

export async function saveOrgCrewAction(orgId: string, exists: boolean, form: FormData): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success) return { ok: false, error: "Invalid business." };
  const parsed = orgCrewSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client } = await requireProfile();
  const { error } = exists
    ? await client.rpc("org_update_crew", { p_org: orgId, p_name: parsed.data.name, p_tagline: parsed.data.tagline, p_kind: parsed.data.kind })
    : await client.rpc("org_create_crew", { p_org: orgId, p_name: parsed.data.name, p_tagline: parsed.data.tagline, p_kind: parsed.data.kind });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/dashboard/business", "layout");
  revalidatePath("/crews");
  return { ok: true, data: undefined };
}

export async function associateBuildAction(orgId: string, vehicleId: string): Promise<ActionResult> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(vehicleId).success) return { ok: false, error: "Invalid request." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("org_associate_build", { p_org: orgId, p_vehicle_id: vehicleId });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/dashboard/business", "layout");
  return { ok: true, data: undefined };
}

export async function removeCrewBuildAction(crewId: string, vehicleId: string): Promise<ActionResult> {
  if (!uuid.safeParse(crewId).success || !uuid.safeParse(vehicleId).success) return { ok: false, error: "Invalid request." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("remove_crew_build", { p_crew_id: crewId, p_vehicle_id: vehicleId });
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/dashboard/business", "layout");
  return { ok: true, data: undefined };
}

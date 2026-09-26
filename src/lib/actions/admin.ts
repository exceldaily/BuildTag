"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validation/common";

/**
 * Admin server actions. requireAdmin() checks the admins table, and every
 * database function called here re-checks buildtag.is_admin() itself, so the
 * UI is never the only gate.
 */

export async function setVehicleStatusAction(vehicleId: string, status: "active" | "disabled"): Promise<ActionResult> {
  const parsed = z.object({ vehicleId: z.string().uuid(), status: z.enum(["active", "disabled"]) }).safeParse({ vehicleId, status });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_set_vehicle_status", { p_vehicle_id: parsed.data.vehicleId, p_status: parsed.data.status });
  if (error) return { ok: false, error: error.message };
  const { data } = await client.from("vehicles").select("slug").eq("id", vehicleId).maybeSingle();
  if (data?.slug) revalidatePath(`/build/${data.slug}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/explore");
  return { ok: true, data: undefined };
}

export async function setQrStatusAction(qrId: string, status: "active" | "disabled"): Promise<ActionResult> {
  const parsed = z.object({ qrId: z.string().uuid(), status: z.enum(["active", "disabled"]) }).safeParse({ qrId, status });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_set_qr_status", { p_qr_id: parsed.data.qrId, p_status: parsed.data.status });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, data: undefined };
}

export async function updateReportAction(
  reportId: string,
  status: "open" | "reviewing" | "resolved" | "dismissed",
  note: string,
): Promise<ActionResult> {
  const parsed = z
    .object({
      reportId: z.string().uuid(),
      status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
      note: z.string().trim().max(1000),
    })
    .safeParse({ reportId, status, note });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_update_report", {
    p_report_id: parsed.data.reportId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, data: undefined };
}

/** Grant complimentary Pro (lifetime when months is null) or remove it. */
export async function adminSetPlanAction(input: { userId: string; plan: "free" | "pro"; months: number | null; note?: string }): Promise<ActionResult> {
  const parsed = z
    .object({ userId: z.string().uuid(), plan: z.enum(["free", "pro"]), months: z.number().int().min(1).max(120).nullable(), note: z.string().trim().max(200).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireAdmin();
  const until = parsed.data.months ? new Date(Date.now() + parsed.data.months * 30.44 * 24 * 3600 * 1000).toISOString() : null;
  const { error } = await client.rpc("admin_set_plan", { p_user_id: parsed.data.userId, p_plan: parsed.data.plan, p_until: until, p_note: parsed.data.note ?? "" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  revalidatePath("/dashboard", "layout");
  return { ok: true, data: undefined };
}

/** Free tag: a paid, zero-total order for a member from an approved snapshot. */
export async function adminPlaceCompOrderAction(input: {
  snapshotId: string;
  userId: string;
  quantity: number;
  shipping: Record<string, string>;
  note?: string;
}): Promise<ActionResult<{ orderId: string }>> {
  const parsed = z
    .object({
      snapshotId: z.string().uuid(),
      userId: z.string().uuid(),
      quantity: z.number().int().min(1).max(50),
      shipping: z.record(z.string(), z.string().max(200)),
      note: z.string().trim().max(200).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireAdmin();
  const { data, error } = await client.rpc("admin_place_comp_order", {
    p_snapshot_id: parsed.data.snapshotId,
    p_user_id: parsed.data.userId,
    p_quantity: parsed.data.quantity,
    p_shipping: parsed.data.shipping,
    p_note: parsed.data.note ?? "",
  });
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create the free order." };
  revalidatePath("/admin/orders");
  revalidatePath("/dashboard/orders");
  return { ok: true, data: { orderId: data as string } };
}

/** Grant or remove BuildTags admin. The database refuses removing yourself or the last admin (0019). */
export async function adminSetAdminAction(userId: string, makeAdmin: boolean): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: "Invalid user." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_set_admin", { p_user_id: userId, p_admin: makeAdmin });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  return { ok: true, data: undefined };
}

const banReason = z.string().trim().max(500);

/** Ban an account: blocks sign-in, ends sessions, optionally hides its builds and bans its email (0020). */
export async function adminBanUserAction(userId: string, input: { reason: string; hideBuilds: boolean; banEmail: boolean }): Promise<ActionResult> {
  const parsed = z.object({ userId: z.string().uuid(), reason: banReason, hideBuilds: z.boolean(), banEmail: z.boolean() }).safeParse({ userId, ...input });
  if (!parsed.success) return { ok: false, error: "Invalid ban." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_ban_user", {
    p_user_id: userId,
    p_reason: parsed.data.reason,
    p_hide_builds: parsed.data.hideBuilds,
    p_ban_email: parsed.data.banEmail,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  revalidatePath("/admin/bans");
  return { ok: true, data: undefined };
}

export async function adminUnbanUserAction(userId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: "Invalid user." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_unban_user", { p_user_id: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  revalidatePath("/admin/bans");
  return { ok: true, data: undefined };
}

export async function adminBanEmailAction(email: string, reason: string): Promise<ActionResult> {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200), reason: banReason }).safeParse({ email, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_ban_email", { p_email: parsed.data.email, p_reason: parsed.data.reason });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/bans");
  return { ok: true, data: undefined };
}

export async function adminUnbanEmailAction(email: string): Promise<ActionResult> {
  if (!z.string().max(200).safeParse(email).success) return { ok: false, error: "Invalid email." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_unban_email", { p_email: email });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/bans");
  return { ok: true, data: undefined };
}

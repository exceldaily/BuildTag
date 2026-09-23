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

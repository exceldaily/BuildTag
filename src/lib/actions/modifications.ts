"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/supabase/server";
import type { ModificationRow } from "@/lib/types";
import { fieldErrors, formToObject, type ActionResult } from "@/lib/validation/common";
import { modificationSchema, quickModSchema } from "@/lib/validation/modification";

async function revalidateForVehicle(vehicleId: string) {
  const { client } = await requireProfile();
  const { data } = await client.from("vehicles").select("slug").eq("id", vehicleId).maybeSingle();
  revalidatePath(`/dashboard/vehicles/${vehicleId}`, "layout");
  revalidatePath("/dashboard");
  if (data?.slug) revalidatePath(`/build/${data.slug}`);
}

export async function addModificationAction(vehicleId: string, form: FormData): Promise<ActionResult<ModificationRow>> {
  const raw = formToObject(form);
  const parsed = raw.quick ? quickModSchema.safeParse(raw) : modificationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const { client } = await requireProfile();
  const { data: last } = await client
    .from("modifications")
    .select("sort_order")
    .eq("vehicle_id", vehicleId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await client
    .from("modifications")
    .insert({ ...parsed.data, vehicle_id: vehicleId, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not add the modification." };
  await revalidateForVehicle(vehicleId);
  return { ok: true, data: data as ModificationRow };
}

export async function updateModificationAction(id: string, form: FormData): Promise<ActionResult<ModificationRow>> {
  const parsed = modificationSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client } = await requireProfile();
  const { data, error } = await client.from("modifications").update(parsed.data).eq("id", id).select("*").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Modification not found." };
  await revalidateForVehicle((data as ModificationRow).vehicle_id);
  return { ok: true, data: data as ModificationRow };
}

/**
 * Owners can hide any part from their public page, including parts a business
 * recorded (those cannot be edited or deleted by the owner, see 0014).
 */
export async function setModificationHiddenAction(id: string, hidden: boolean): Promise<ActionResult<ModificationRow>> {
  const parsed = z.object({ id: z.string().uuid(), hidden: z.boolean() }).safeParse({ id, hidden });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireProfile();
  const { data, error } = await client
    .from("modifications")
    .update({ is_hidden: parsed.data.hidden })
    .eq("id", parsed.data.id)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Modification not found." };
  await revalidateForVehicle((data as ModificationRow).vehicle_id);
  return { ok: true, data: data as ModificationRow };
}

export async function deleteModificationAction(id: string): Promise<ActionResult> {
  const { client } = await requireProfile();
  const { data, error } = await client.from("modifications").delete().eq("id", id).select("vehicle_id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Modification not found." };
  await revalidateForVehicle(data.vehicle_id);
  return { ok: true, data: undefined };
}

export async function reorderModificationsAction(vehicleId: string, orderedIds: string[]): Promise<ActionResult> {
  const parsed = z.array(z.string().uuid()).max(500).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const { client } = await requireProfile();
  const updates = parsed.data.map((id, index) =>
    client.from("modifications").update({ sort_order: index }).eq("id", id).eq("vehicle_id", vehicleId),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  await revalidateForVehicle(vehicleId);
  return { ok: true, data: undefined };
}

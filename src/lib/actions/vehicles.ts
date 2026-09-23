"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/supabase/server";
import type { Database, VehicleRow } from "@/lib/types";

type VehicleUpdate = Database["buildtag"]["Tables"]["vehicles"]["Update"];
import { fieldErrors, formToObject, type ActionResult } from "@/lib/validation/common";
import {
  vehicleBasicsSchema,
  vehicleCostSchema,
  vehicleOverviewSchema,
  vehiclePerformanceSchema,
  vehicleSettingsSchema,
} from "@/lib/validation/vehicle";

function revalidateVehicle(id: string, slug?: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/vehicles/${id}`, "layout");
  if (slug) revalidatePath(`/build/${slug}`);
  revalidatePath("/explore");
}

function friendlyDbError(message: string): string {
  if (message.includes("vehicle limit")) return "Your plan allows one vehicle. Upgrade to Pro to add more.";
  if (message.includes("photo limit")) return "You have reached the photo limit for your plan.";
  if (message.includes("design limit")) return "You have reached the saved design limit for your plan.";
  if (message.includes("vehicles_slug_key") || message.includes("duplicate key")) return "That URL is already taken.";
  return message;
}

/** Wizard step 1. Creates the vehicle (and its permanent QR via trigger). */
export async function createVehicleAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = vehicleBasicsSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const { client, user } = await requireProfile("/dashboard/vehicles/new");
  const { data, error } = await client
    .from("vehicles")
    .insert({ ...parsed.data, owner_id: user.id })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: friendlyDbError(error?.message ?? "Could not create the vehicle.") };
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/vehicles/${data.id}/setup/photos`);
}

async function updateVehicle(id: string, patch: VehicleUpdate): Promise<ActionResult<VehicleRow>> {
  const { client } = await requireProfile();
  const { data, error } = await client.from("vehicles").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (!data) return { ok: false, error: "Vehicle not found." };
  revalidateVehicle(id, (data as VehicleRow).slug);
  return { ok: true, data: data as VehicleRow };
}

export async function saveOverviewAction(id: string, form: FormData): Promise<ActionResult<VehicleRow>> {
  const parsed = vehicleOverviewSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  return updateVehicle(id, parsed.data);
}

export async function savePerformanceAction(id: string, form: FormData): Promise<ActionResult<VehicleRow>> {
  const parsed = vehiclePerformanceSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  return updateVehicle(id, parsed.data);
}

export async function saveCostAction(id: string, form: FormData): Promise<ActionResult<VehicleRow>> {
  const parsed = vehicleCostSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  return updateVehicle(id, parsed.data);
}

export async function saveSettingsAction(id: string, form: FormData): Promise<ActionResult<VehicleRow>> {
  const parsed = vehicleSettingsSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { client } = await requireProfile();
  const { data: before } = await client.from("vehicles").select("slug").eq("id", id).maybeSingle();
  const result = await updateVehicle(id, parsed.data);
  if (result.ok && before?.slug && before.slug !== parsed.data.slug) revalidatePath(`/build/${before.slug}`);
  return result;
}

export async function setHeroPhotoAction(id: string, url: string | null): Promise<ActionResult<VehicleRow>> {
  const parsed = z.string().url().nullable().safeParse(url);
  if (!parsed.success) return { ok: false, error: "Invalid image." };
  return updateVehicle(id, { hero_image_url: parsed.data });
}

export async function setProfilePhotoAction(id: string, url: string | null): Promise<ActionResult<VehicleRow>> {
  const parsed = z.string().url().nullable().safeParse(url);
  if (!parsed.success) return { ok: false, error: "Invalid image." };
  return updateVehicle(id, { profile_image_url: parsed.data });
}

export async function deleteVehicleAction(id: string): Promise<ActionResult> {
  const { client, user } = await requireProfile();
  const { data: vehicle } = await client.from("vehicles").select("slug").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!vehicle) return { ok: false, error: "Vehicle not found." };

  // Storage objects first: the storage policies check vehicle ownership, so
  // they must be removed while the vehicle row still exists.
  const { data: objects } = await client.storage.from("buildtag-photos").list(id, { limit: 1000 });
  if (objects?.length) {
    const paths: string[] = [];
    for (const folder of objects) {
      const { data: files } = await client.storage.from("buildtag-photos").list(`${id}/${folder.name}`, { limit: 10 });
      for (const f of files ?? []) paths.push(`${id}/${folder.name}/${f.name}`);
    }
    if (paths.length) await client.storage.from("buildtag-photos").remove(paths);
  }

  const { error } = await client.from("vehicles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath(`/build/${vehicle.slug}`);
  redirect("/dashboard");
}

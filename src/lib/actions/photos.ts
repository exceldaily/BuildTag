"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PHOTO_BUCKET, photoUrl } from "@/lib/storage";
import { requireProfile } from "@/lib/supabase/server";
import type { VehiclePhotoRow } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

async function revalidatePhotoOwner(vehicleId: string) {
  const { client } = await requireProfile();
  const { data } = await client.from("vehicles").select("slug").eq("id", vehicleId).maybeSingle();
  revalidatePath(`/dashboard/vehicles/${vehicleId}`, "layout");
  revalidatePath("/dashboard");
  if (data?.slug) revalidatePath(`/build/${data.slug}`);
}

export async function deletePhotoAction(photoId: string): Promise<ActionResult> {
  const { client } = await requireProfile();
  const { data: photo } = await client.from("vehicle_photos").select("*").eq("id", photoId).maybeSingle();
  if (!photo) return { ok: false, error: "Photo not found." };
  const row = photo as VehiclePhotoRow;

  const { error } = await client.from("vehicle_photos").delete().eq("id", photoId);
  if (error) return { ok: false, error: error.message };

  if (!row.storage_path.startsWith("demo/")) {
    await client.storage.from(PHOTO_BUCKET).remove([`${row.storage_path}/full.webp`, `${row.storage_path}/thumb.webp`]);
  }

  // Clear hero/profile references that pointed at this photo.
  const full = photoUrl(row.storage_path, "full");
  const { data: vehicle } = await client
    .from("vehicles")
    .select("hero_image_url, profile_image_url")
    .eq("id", row.vehicle_id)
    .maybeSingle();
  if (vehicle) {
    const patch: { hero_image_url?: null; profile_image_url?: null } = {};
    if (vehicle.hero_image_url === full) patch.hero_image_url = null;
    if (vehicle.profile_image_url === full) patch.profile_image_url = null;
    if (Object.keys(patch).length) await client.from("vehicles").update(patch).eq("id", row.vehicle_id);
  }

  await revalidatePhotoOwner(row.vehicle_id);
  return { ok: true, data: undefined };
}

export async function reorderPhotosAction(vehicleId: string, orderedIds: string[]): Promise<ActionResult> {
  const parsed = z.array(z.string().uuid()).max(100).safeParse(orderedIds);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const { client } = await requireProfile();
  const results = await Promise.all(
    parsed.data.map((id, index) =>
      client.from("vehicle_photos").update({ sort_order: index }).eq("id", id).eq("vehicle_id", vehicleId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  await revalidatePhotoOwner(vehicleId);
  return { ok: true, data: undefined };
}

export async function updatePhotoCaptionAction(photoId: string, caption: string, altText: string): Promise<ActionResult> {
  const parsed = z.object({ caption: z.string().trim().max(200), altText: z.string().trim().max(200) }).safeParse({ caption, altText });
  if (!parsed.success) return { ok: false, error: "Caption is too long." };
  const { client } = await requireProfile();
  const { data, error } = await client
    .from("vehicle_photos")
    .update({ caption: parsed.data.caption, alt_text: parsed.data.altText })
    .eq("id", photoId)
    .select("vehicle_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Photo not found." };
  await revalidatePhotoOwner(data.vehicle_id);
  return { ok: true, data: undefined };
}

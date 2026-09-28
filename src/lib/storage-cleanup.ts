import "server-only";

import type { BuildTagClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, PHOTO_BUCKET } from "@/lib/storage";

const TAG_ASSET_BUCKET = "buildtag-tag-assets";

/**
 * Removes every photo of a vehicle (`<vehicleId>/<photoId>/{full,thumb}.webp`).
 * Must run while the vehicle row still exists: the storage policies check
 * vehicle ownership.
 */
export async function removeVehiclePhotos(client: BuildTagClient, vehicleId: string): Promise<void> {
  const bucket = client.storage.from(PHOTO_BUCKET);
  const { data: folders } = await bucket.list(vehicleId, { limit: 1000 });
  if (!folders?.length) return;
  const paths: string[] = [];
  for (const folder of folders) {
    const { data: files } = await bucket.list(`${vehicleId}/${folder.name}`, { limit: 10 });
    for (const f of files ?? []) paths.push(`${vehicleId}/${folder.name}/${f.name}`);
  }
  if (paths.length) await bucket.remove(paths);
}

/** Removes the files kept under `<userId>/` (avatar, uploaded Designer assets). */
export async function removeUserFiles(client: BuildTagClient, userId: string): Promise<void> {
  for (const name of [AVATAR_BUCKET, TAG_ASSET_BUCKET]) {
    const bucket = client.storage.from(name);
    const { data: files } = await bucket.list(userId, { limit: 1000 });
    const paths = (files ?? []).filter((f) => f.id).map((f) => `${userId}/${f.name}`);
    if (paths.length) await bucket.remove(paths);
  }
}

/**
 * Storage URL helpers. Both buckets are public-read, so URLs are plain and
 * cacheable (no signing round-trip on the scanned build page).
 */

export const PHOTO_BUCKET = "buildtag-photos";
export const AVATAR_BUCKET = "buildtag-avatars";

export type PhotoVariant = "full" | "thumb";

function storageOrigin(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
}

/**
 * Public URL for a photo variant. Demo/seed photos use the `demo/` prefix and
 * resolve to the app's own /public folder so seeding needs no storage upload.
 */
export function photoUrl(storagePath: string, variant: PhotoVariant = "full"): string {
  if (storagePath.startsWith("demo/")) {
    return `/${storagePath}/${variant}.webp`;
  }
  return `${storageOrigin()}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}/${variant}.webp`;
}

export function avatarUrl(userId: string, version?: string | number): string {
  const v = version ? `?v=${version}` : "";
  return `${storageOrigin()}/storage/v1/object/public/${AVATAR_BUCKET}/${userId}/avatar.webp${v}`;
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

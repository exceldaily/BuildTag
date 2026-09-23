import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, PHOTO_BUCKET, photoUrl } from "@/lib/storage";
import { getOptionalUser } from "@/lib/supabase/server";
import type { VehiclePhotoRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FULL_MAX = 2000;
const THUMB_MAX = 640;

/**
 * Photo upload. Runs as the signed-in user: the storage policy only lets an
 * owner write under "<vehicle_id>/", and the vehicle_photos insert is RLS
 * checked. Images are re-encoded to WebP (strips EXIF, including GPS) and a
 * thumbnail is generated for galleries and cards.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/vehicles/[id]/photos">) {
  const { id: vehicleId } = await context.params;
  const ctx = await getOptionalUser();
  if (!ctx) return NextResponse.json({ ok: false, error: "Sign in to upload." }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(vehicleId)) return NextResponse.json({ ok: false, error: "Invalid vehicle." }, { status: 400 });

  const { client } = ctx;
  const { data: vehicle } = await client.from("vehicles").select("id, hero_image_url").eq("id", vehicleId).maybeSingle();
  if (!vehicle) return NextResponse.json({ ok: false, error: "Vehicle not found." }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file received." }, { status: 400 });
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return NextResponse.json({ ok: false, error: "Use a JPEG, PNG or WebP image." }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "Images must be under 10 MB." }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  let full: Buffer;
  let thumb: Buffer;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const base = sharp(input, { failOn: "none" }).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) throw new Error("unreadable");
    const fullImage = await base.clone().resize({ width: FULL_MAX, height: FULL_MAX, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    full = fullImage.data;
    width = fullImage.info.width;
    height = fullImage.info.height;
    thumb = await base.clone().resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  } catch {
    return NextResponse.json({ ok: false, error: "That image could not be processed." }, { status: 422 });
  }

  const { data: last } = await client
    .from("vehicle_photos")
    .select("sort_order")
    .eq("vehicle_id", vehicleId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const photoId = crypto.randomUUID();
  const storagePath = `${vehicleId}/${photoId}`;

  const uploads = await Promise.all([
    client.storage.from(PHOTO_BUCKET).upload(`${storagePath}/full.webp`, full, { contentType: "image/webp", cacheControl: "31536000", upsert: false }),
    client.storage.from(PHOTO_BUCKET).upload(`${storagePath}/thumb.webp`, thumb, { contentType: "image/webp", cacheControl: "31536000", upsert: false }),
  ]);
  const uploadError = uploads.find((u) => u.error)?.error;
  if (uploadError) {
    return NextResponse.json({ ok: false, error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: photo, error } = await client
    .from("vehicle_photos")
    .insert({
      id: photoId,
      vehicle_id: vehicleId,
      storage_path: storagePath,
      alt_text: String(form.get("alt_text") ?? "").slice(0, 200),
      caption: String(form.get("caption") ?? "").slice(0, 200),
      width,
      height,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error || !photo) {
    await client.storage.from(PHOTO_BUCKET).remove([`${storagePath}/full.webp`, `${storagePath}/thumb.webp`]);
    const msg = error?.message.includes("photo limit") ? "Photo limit reached for your plan." : error?.message ?? "Could not save the photo.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  // First photo becomes the hero automatically.
  let heroSet = false;
  if (!vehicle.hero_image_url || form.get("set_hero") === "1") {
    await client.from("vehicles").update({ hero_image_url: photoUrl(storagePath, "full") }).eq("id", vehicleId);
    heroSet = true;
  }

  return NextResponse.json({ ok: true, photo: photo as VehiclePhotoRow, heroSet });
}

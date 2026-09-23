import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

import { ACCEPTED_IMAGE_TYPES, AVATAR_BUCKET, MAX_AVATAR_BYTES, avatarUrl } from "@/lib/storage";
import { getOptionalUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Avatar upload: square 512px WebP under "<user_id>/avatar.webp". */
export async function POST(request: NextRequest) {
  const ctx = await getOptionalUser();
  if (!ctx) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });

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
  if (file.size > MAX_AVATAR_BYTES) return NextResponse.json({ ok: false, error: "Avatars must be under 5 MB." }, { status: 413 });

  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" })
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 84 })
      .toBuffer();
  } catch {
    return NextResponse.json({ ok: false, error: "That image could not be processed." }, { status: 422 });
  }

  const path = `${ctx.user.id}/avatar.webp`;
  const { error } = await ctx.client.storage.from(AVATAR_BUCKET).upload(path, out, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
  if (error) return NextResponse.json({ ok: false, error: `Upload failed: ${error.message}` }, { status: 500 });

  const url = avatarUrl(ctx.user.id, Date.now());
  await ctx.client.from("profiles").update({ avatar_url: url }).eq("id", ctx.user.id);
  return NextResponse.json({ ok: true, url });
}

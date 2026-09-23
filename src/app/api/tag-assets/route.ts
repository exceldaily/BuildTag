import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

import { getOptionalUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "buildtag-tag-assets";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Owner-supplied decal artwork (center logos, background photos). Raster
 * uploads are re-encoded to PNG (logos, keeps transparency) or WebP
 * (backgrounds) and stored under "<user_id>/". SVG logos are stored as-is
 * after a size check; scripts are stripped by serving them as <image>.
 */
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
  const kind = form.get("kind") === "background" ? "background" : "logo";
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "Files must be under 5 MB." }, { status: 413 });

  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  let contentType: string;
  let ext: string;

  if (file.type === "image/svg+xml") {
    const text = input.toString("utf8");
    if (/<script|on\w+=|javascript:/i.test(text)) return NextResponse.json({ ok: false, error: "SVG contains scripting and was rejected." }, { status: 415 });
    out = input;
    contentType = "image/svg+xml";
    ext = "svg";
  } else if (["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    try {
      const base = sharp(input, { failOn: "none" }).rotate();
      if (kind === "logo") {
        out = await base.resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        contentType = "image/png";
        ext = "png";
      } else {
        out = await base.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        contentType = "image/webp";
        ext = "webp";
      }
    } catch {
      return NextResponse.json({ ok: false, error: "That image could not be processed." }, { status: 422 });
    }
  } else {
    return NextResponse.json({ ok: false, error: "Use PNG, JPEG, WebP or SVG." }, { status: 415 });
  }

  const path = `${ctx.user.id}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await ctx.client.storage.from(BUCKET).upload(path, out, { contentType, cacheControl: "31536000", upsert: false });
  if (error) return NextResponse.json({ ok: false, error: `Upload failed: ${error.message}` }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return NextResponse.json({ ok: true, url });
}

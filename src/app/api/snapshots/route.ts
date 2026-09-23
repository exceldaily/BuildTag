import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { scanUrl } from "@/lib/qr/generate";
import { siteUrl } from "@/lib/env";
import { getOptionalUser } from "@/lib/supabase/server";
import { normalizeConfig } from "@/lib/tag/templates";
import { toInches } from "@/lib/tag/sizes";
import type { Json, ProductionSnapshotRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "buildtag-production";

const metaSchema = z.object({
  vehicleId: z.string().uuid(),
  designId: z.string().uuid().nullable(),
  printSpecificationId: z.string().min(1).max(60),
  quantity: z.coerce.number().int().min(1).max(500),
  validationStatus: z.enum(["passed", "heuristic_only", "failed"]),
  validationReport: z.record(z.string(), z.unknown()).default({}),
  config: z.record(z.string(), z.unknown()),
});

/**
 * PRODUCTION SNAPSHOT
 *
 * Called when the owner approves a proof. Receives the exact SVG and PNG the
 * browser rendered from the design (fonts converted to paths, images
 * embedded), stores them privately, and freezes configuration, dimensions,
 * material and the QR destination. Rows are immutable at the database level.
 */
export async function POST(request: NextRequest) {
  const ctx = await getOptionalUser();
  if (!ctx) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  let meta: z.infer<typeof metaSchema>;
  try {
    meta = metaSchema.parse(JSON.parse(String(form.get("meta") ?? "{}")));
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid snapshot metadata." }, { status: 400 });
  }
  const svgFile = form.get("svg");
  const pngFile = form.get("png");
  if (!(svgFile instanceof File) || !(pngFile instanceof File)) return NextResponse.json({ ok: false, error: "Artwork files missing." }, { status: 400 });
  if (svgFile.size > 20 * 1024 * 1024 || pngFile.size > 25 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Artwork too large." }, { status: 413 });

  const { client, user } = ctx;

  // Ownership + live data for the frozen destination.
  const { data: vehicle } = await client.from("vehicles").select("id").eq("id", meta.vehicleId).eq("owner_id", user.id).maybeSingle();
  if (!vehicle) return NextResponse.json({ ok: false, error: "Vehicle not found." }, { status: 404 });
  const { data: qr } = await client.from("qr_codes").select("id, code").eq("vehicle_id", meta.vehicleId).order("created_at").limit(1).maybeSingle();
  if (!qr) return NextResponse.json({ ok: false, error: "This vehicle has no permanent code." }, { status: 400 });
  const { data: spec } = await client.from("print_specifications").select("*").eq("id", meta.printSpecificationId).maybeSingle();
  if (!spec) return NextResponse.json({ ok: false, error: "Unknown print specification." }, { status: 400 });

  const config = normalizeConfig(meta.config);
  const inches = toInches(config.size);
  const snapshotId = crypto.randomUUID();
  const base = `${user.id}/${snapshotId}`;
  const svgPath = `${base}/artwork.svg`;
  const pngPath = `${base}/artwork.png`;

  const svgText = await svgFile.text();
  if (/<text[\s>]/.test(svgText) || svgText.includes("NaN")) {
    return NextResponse.json({ ok: false, error: "Artwork still contains live text or broken outlines. Re-open the designer and approve again." }, { status: 422 });
  }
  if (!svgText.startsWith("<svg")) return NextResponse.json({ ok: false, error: "Invalid SVG artwork." }, { status: 400 });

  const uploads = await Promise.all([
    client.storage.from(BUCKET).upload(svgPath, Buffer.from(svgText, "utf8"), { contentType: "image/svg+xml", upsert: false }),
    client.storage.from(BUCKET).upload(pngPath, Buffer.from(await pngFile.arrayBuffer()), { contentType: "image/png", upsert: false }),
  ]);
  const uploadError = uploads.find((u) => u.error)?.error;
  if (uploadError) return NextResponse.json({ ok: false, error: `Artwork upload failed: ${uploadError.message}` }, { status: 500 });

  const { data, error } = await client
    .from("tag_production_snapshots")
    .insert({
      id: snapshotId,
      user_id: user.id,
      tag_design_id: meta.designId,
      vehicle_id: meta.vehicleId,
      qr_code_id: qr.id,
      print_specification_id: spec.id,
      configuration_json: config as unknown as Json,
      width: Math.round(inches.width * 100) / 100,
      height: Math.round(inches.height * 100) / 100,
      units: "in",
      material: spec.material,
      finish: spec.finish,
      quantity: meta.quantity,
      qr_destination_at_order: scanUrl(siteUrl(), qr.code),
      svg_storage_path: svgPath,
      png_storage_path: pngPath,
      validation_status: meta.validationStatus,
      validation_report: meta.validationReport as Json,
    })
    .select("*")
    .single();

  if (error || !data) {
    await client.storage.from(BUCKET).remove([svgPath, pngPath]);
    return NextResponse.json({ ok: false, error: error?.message ?? "Could not save the snapshot." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, snapshot: data as ProductionSnapshotRow });
}

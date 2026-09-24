import { createHash } from "node:crypto";

import jsQR from "jsqr";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
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
const PROOF_BUCKET = "buildtag-proofs";

const metaSchema = z.object({
  vehicleId: z.string().uuid(),
  designId: z.string().uuid().nullable(),
  printSpecificationId: z.string().min(1).max(60),
  quantity: z.coerce.number().int().min(1).max(500),
  validationStatus: z.enum(["passed", "heuristic_only", "failed"]),
  validationReport: z.record(z.string(), z.unknown()).default({}),
  config: z.record(z.string(), z.unknown()),
  admin: z.boolean().optional(),
});

/**
 * Authoritative QR check: rasterize the production SVG on the server and
 * decode it. The browser's result is advisory; this one decides whether the
 * snapshot may be ordered.
 */
async function serverDecode(svg: string, expected: string): Promise<{ ok: boolean; decoded: string | null; width: number; error?: string }[]> {
  const out: { ok: boolean; decoded: string | null; width: number; error?: string }[] = [];
  for (const width of [700, 1200]) {
    try {
      const { data, info } = await sharp(Buffer.from(svg), { density: 300 }).resize({ width }).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const result = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height, { inversionAttempts: "attemptBoth" });
      const decoded = result?.data ?? null;
      out.push({ ok: decoded === expected, decoded, width });
    } catch (err) {
      out.push({ ok: false, decoded: null, width, error: err instanceof Error ? err.message : "rasterize failed" });
    }
  }
  return out;
}

/**
 * PRODUCTION SNAPSHOT
 *
 * Called when the owner approves a proof. Receives the exact SVG and PNG the
 * browser rendered from the design (fonts converted to paths, images
 * embedded), re-validates the QR on the server, stores the files privately,
 * publishes a small customer-safe proof image, and freezes configuration,
 * dimensions, material, checksum and the QR destination. Rows are immutable
 * at the database level.
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

  // Ownership (or admin, for free tags) + live data for the frozen destination.
  let allowed = false;
  if (meta.admin) {
    const { data: isAdmin } = await client.rpc("is_admin");
    allowed = Boolean(isAdmin);
    if (!allowed) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  }
  const vehicleQuery = client.from("vehicles").select("id").eq("id", meta.vehicleId);
  const { data: vehicle } = await (allowed ? vehicleQuery : vehicleQuery.eq("owner_id", user.id)).maybeSingle();
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
  const proofPath = `${base}/proof.png`;

  const svgText = await svgFile.text();
  if (/<text[\s>]/.test(svgText) || svgText.includes("NaN")) {
    return NextResponse.json({ ok: false, error: "Artwork still contains live text or broken outlines. Re-open the designer and approve again." }, { status: 422 });
  }
  if (!svgText.startsWith("<svg")) return NextResponse.json({ ok: false, error: "Invalid SVG artwork." }, { status: 400 });

  // Authoritative server-side QR validation on the exact production file.
  const expected = scanUrl(siteUrl(), qr.code);
  const serverChecks = await serverDecode(svgText, expected);
  const serverOk = serverChecks.every((c) => c.ok);
  const validationStatus: ProductionSnapshotRow["validation_status"] = !serverOk ? "failed" : meta.validationStatus === "failed" ? "failed" : meta.validationStatus;
  const report = { ...meta.validationReport, server: { ok: serverOk, expected, checks: serverChecks, checkedAt: new Date().toISOString() } };
  const sha256 = createHash("sha256").update(svgText, "utf8").digest("hex");

  const pngBuffer = Buffer.from(await pngFile.arrayBuffer());
  let proofBuffer: Buffer | null = null;
  try {
    proofBuffer = await sharp(pngBuffer).resize({ width: 900, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  } catch {
    proofBuffer = null;
  }

  const uploads = await Promise.all([
    client.storage.from(BUCKET).upload(svgPath, Buffer.from(svgText, "utf8"), { contentType: "image/svg+xml", upsert: false }),
    client.storage.from(BUCKET).upload(pngPath, pngBuffer, { contentType: "image/png", upsert: false }),
    proofBuffer ? client.storage.from(PROOF_BUCKET).upload(proofPath, proofBuffer, { contentType: "image/png", upsert: false }) : Promise.resolve({ error: null }),
  ]);
  const uploadError = uploads.slice(0, 2).find((u) => u.error)?.error;
  if (uploadError) return NextResponse.json({ ok: false, error: `Artwork upload failed: ${uploadError.message}` }, { status: 500 });
  const proofStored = proofBuffer !== null && !uploads[2].error;

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
      qr_destination_at_order: expected,
      svg_storage_path: svgPath,
      png_storage_path: pngPath,
      proof_storage_path: proofStored ? proofPath : null,
      artwork_sha256: sha256,
      validation_status: validationStatus,
      validation_report: report as Json,
    })
    .select("*")
    .single();

  if (error || !data) {
    await client.storage.from(BUCKET).remove([svgPath, pngPath]);
    if (proofStored) await client.storage.from(PROOF_BUCKET).remove([proofPath]);
    return NextResponse.json({ ok: false, error: error?.message ?? "Could not save the snapshot." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, snapshot: data as ProductionSnapshotRow, serverValidation: { ok: serverOk, checks: serverChecks } });
}

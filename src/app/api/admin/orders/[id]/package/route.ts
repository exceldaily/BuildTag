import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";

import { productionSheetHtml } from "@/lib/orders/production-sheet";
import { productionFileName } from "@/lib/orders/status";
import { qrSvg } from "@/lib/qr/generate";
import { getOptionalUser } from "@/lib/supabase/server";
import type { OrderItemRow, OrderRow, PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MANUFACTURER PACKAGE (admin only): one ZIP with the production SVG, the
 * high-res PNG, the proof PNG and the production sheet, all cleanly named.
 * Contains nothing about payment or internal notes.
 */
export async function GET(_request: NextRequest, context: RouteContext<"/api/admin/orders/[id]/package">) {
  const { id } = await context.params;
  const ctx = await getOptionalUser();
  if (!ctx) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const { data: isAdmin } = await ctx.client.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });

  const { client } = ctx;
  const { data: o } = await client.from("orders").select("*").eq("id", id).maybeSingle();
  if (!o) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  const order = o as OrderRow;
  const { data: items } = await client.from("order_items").select("*").eq("order_id", id).order("created_at");
  const item = ((items ?? []) as OrderItemRow[])[0];
  if (!item?.production_snapshot_id) return NextResponse.json({ ok: false, error: "No production snapshot on this order." }, { status: 404 });
  const { data: s } = await client.from("tag_production_snapshots").select("*").eq("id", item.production_snapshot_id).maybeSingle();
  const snapshot = (s as ProductionSnapshotRow | null) ?? null;
  if (!snapshot) return NextResponse.json({ ok: false, error: "Snapshot not found." }, { status: 404 });
  const [{ data: sp }, { data: v }] = await Promise.all([
    client.from("print_specifications").select("*").eq("id", snapshot.print_specification_id ?? "").maybeSingle(),
    client.from("vehicles").select("year, make, model, trim, nickname").eq("id", snapshot.vehicle_id ?? "").maybeSingle(),
  ]);

  const zip = new JSZip();
  const num = order.order_number;
  const production = client.storage.from("buildtag-production");
  if (snapshot.svg_storage_path) {
    const { data } = await production.download(snapshot.svg_storage_path);
    if (data) zip.file(productionFileName(num, "production-svg"), Buffer.from(await data.arrayBuffer()));
  }
  if (snapshot.png_storage_path) {
    const { data } = await production.download(snapshot.png_storage_path);
    if (data) zip.file(productionFileName(num, "production-png"), Buffer.from(await data.arrayBuffer()));
  }
  let proofDataUrl: string | null = null;
  if (snapshot.proof_storage_path) {
    const { data } = await client.storage.from("buildtag-proofs").download(snapshot.proof_storage_path);
    if (data) {
      const buf = Buffer.from(await data.arrayBuffer());
      zip.file(productionFileName(num, "proof-png"), buf);
      proofDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    }
  }
  const html = productionSheetHtml({
    order,
    item,
    snapshot,
    spec: (sp as PrintSpecificationRow | null) ?? null,
    vehicle: (v as { year: number | null; make: string; model: string; trim: string; nickname: string } | null) ?? null,
    proofSrc: proofDataUrl,
    qrSvg: qrSvg(snapshot.qr_destination_at_order, 120),
    notes: "",
  });
  zip.file(productionFileName(num, "production-sheet"), html);
  zip.file("README.txt", `BuildTags production package for ${num}\n\nFiles:\n- ${productionFileName(num, "production-svg")}: vector artwork, fonts outlined, bleed included, CutContour layer = cut line\n- ${productionFileName(num, "production-png")}: 300 DPI raster of the same artwork\n- ${productionFileName(num, "proof-png")}: customer-approved proof\n- ${productionFileName(num, "production-sheet")}: sizes, material, quantity and ship-to\n\nPrint at 100%. Do not scale. Keep the quiet zone around the QR clear.\n`);

  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${productionFileName(num, "package")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

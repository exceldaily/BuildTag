import { NextResponse, type NextRequest } from "next/server";

import { productionFileName } from "@/lib/orders/status";
import { getOptionalUser } from "@/lib/supabase/server";
import type { ProductionSnapshotRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Production artwork download. ADMIN ONLY: customers never receive the
 * print-ready SVG/PNG (they see the proof preview on their order page).
 * Storage RLS enforces the same rule underneath.
 *
 *   ?format=svg|png   ?order=BT-000127  (clean file name for the download)
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/snapshots/[id]/artwork">) {
  const { id } = await context.params;
  const ctx = await getOptionalUser();
  if (!ctx) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const { data: isAdmin } = await ctx.client.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Production files are available to admins only." }, { status: 403 });

  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const orderNumber = (request.nextUrl.searchParams.get("order") ?? "").replace(/[^A-Za-z0-9-]/g, "");
  const inline = request.nextUrl.searchParams.get("inline") === "1";

  const { data } = await ctx.client.from("tag_production_snapshots").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "Snapshot not found." }, { status: 404 });
  const snap = data as ProductionSnapshotRow;
  const path = format === "png" ? snap.png_storage_path : snap.svg_storage_path;
  if (!path) return NextResponse.json({ ok: false, error: "Artwork missing." }, { status: 404 });

  const { data: file, error } = await ctx.client.storage.from("buildtag-production").download(path);
  if (error || !file) return NextResponse.json({ ok: false, error: "Could not read artwork." }, { status: 404 });

  const filename = orderNumber ? productionFileName(orderNumber, format === "png" ? "production-png" : "production-svg") : `buildtag-${snap.id.slice(0, 8)}-production.${format}`;
  return new NextResponse(file.stream(), {
    headers: {
      "Content-Type": format === "png" ? "image/png" : "image/svg+xml",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

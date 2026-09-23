import { NextResponse, type NextRequest } from "next/server";

import { getOptionalUser } from "@/lib/supabase/server";
import type { ProductionSnapshotRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Streams production artwork (owner or admin, enforced by storage RLS).
 * ?format=svg|png
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/snapshots/[id]/artwork">) {
  const { id } = await context.params;
  const ctx = await getOptionalUser();
  if (!ctx) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";

  const { data } = await ctx.client.from("tag_production_snapshots").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "Snapshot not found." }, { status: 404 });
  const snap = data as ProductionSnapshotRow;
  const path = format === "png" ? snap.png_storage_path : snap.svg_storage_path;
  if (!path) return NextResponse.json({ ok: false, error: "Artwork missing." }, { status: 404 });

  const { data: file, error } = await ctx.client.storage.from("buildtag-production").download(path);
  if (error || !file) return NextResponse.json({ ok: false, error: "Could not read artwork." }, { status: 404 });

  return new NextResponse(file.stream(), {
    headers: {
      "Content-Type": format === "png" ? "image/png" : "image/svg+xml",
      "Content-Disposition": `attachment; filename="buildtag-${snap.id.slice(0, 8)}.${format}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

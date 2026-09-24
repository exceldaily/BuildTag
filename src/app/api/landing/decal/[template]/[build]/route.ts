import { NextResponse, type NextRequest } from "next/server";

import { FALLBACK_CODES, type LandingBuildKey } from "@/lib/landing-config";
import { landingBuild, renderDecalSvg } from "@/lib/landing";
import { TEMPLATES } from "@/lib/tag";
import type { TemplateId } from "@/lib/tag/types";

export const runtime = "nodejs";

const KEYS = Object.keys(FALLBACK_CODES) as LandingBuildKey[];

/**
 * Homepage decal artwork as a cacheable SVG image. Only the curated public
 * demo builds and real templates are accepted, so this can't render
 * arbitrary vehicles. Text is converted to paths, like a Designer export.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/landing/decal/[template]/[build]">) {
  const { template, build } = await context.params;
  if (!(template in TEMPLATES) || !KEYS.includes(build as LandingBuildKey)) {
    return NextResponse.json({ ok: false, error: "Unknown decal." }, { status: 404 });
  }
  const b = await landingBuild(build as LandingBuildKey);
  if (!b) return NextResponse.json({ ok: false, error: "Build not available." }, { status: 404 });
  const svg = await renderDecalSvg(b, template as TemplateId, request.nextUrl.origin).catch(() => null);
  if (!svg) return NextResponse.json({ ok: false, error: "Could not render." }, { status: 500 });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

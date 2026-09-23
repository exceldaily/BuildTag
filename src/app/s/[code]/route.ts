import { NextResponse, type NextRequest } from "next/server";

import { classifyDevice, isLikelyBot, referrerHost } from "@/lib/analytics/device";
import { anonClient } from "@/lib/db/public";

export const dynamic = "force-dynamic";

/**
 * Permanent QR endpoint. Decals encode /s/<CODE>; this resolves the code to
 * whatever the build's current URL is and records the scan. Slugs, usernames
 * and ownership can all change without reprinting a decal.
 */
export async function GET(request: NextRequest, context: RouteContext<"/s/[code]">) {
  const { code } = await context.params;
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const origin = request.nextUrl.origin;

  if (!/^[A-HJ-NP-Z2-9]{6,12}$/.test(cleaned)) {
    return NextResponse.redirect(`${origin}/scan/invalid`, 302);
  }

  const ua = request.headers.get("user-agent");
  const record = !isLikelyBot(ua);

  const { data, error } = await anonClient().rpc("resolve_scan", {
    p_code: cleaned,
    p_referrer: referrerHost(request.headers.get("referer")),
    p_country: request.headers.get("x-vercel-ip-country")?.slice(0, 2) ?? null,
    p_device: classifyDevice(ua),
    p_record: record,
  });

  if (error || !data || typeof data !== "object") {
    return NextResponse.redirect(`${origin}/scan/error`, 302);
  }

  const result = data as { status: string; slug?: string };
  const headers = { "Cache-Control": "no-store" };

  switch (result.status) {
    case "ok":
      return NextResponse.redirect(`${origin}/build/${result.slug}?via=tag`, { status: 302, headers });
    case "private":
      return NextResponse.redirect(`${origin}/scan/private`, { status: 302, headers });
    case "qr_disabled":
      return NextResponse.redirect(`${origin}/scan/disabled`, { status: 302, headers });
    case "build_disabled":
      return NextResponse.redirect(`${origin}/scan/build-disabled`, { status: 302, headers });
    default:
      return NextResponse.redirect(`${origin}/scan/invalid`, { status: 302, headers });
  }
}

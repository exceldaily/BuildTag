import { NextResponse, type NextRequest } from "next/server";

import { anonClient } from "@/lib/db/public";

export const dynamic = "force-dynamic";

/** Outbound social link with click tracking. Only https destinations exist in the database. */
export async function GET(request: NextRequest, context: RouteContext<"/out/[slug]/social/[pid]">) {
  const { slug, pid } = await context.params;
  const origin = request.nextUrl.origin;

  if (!/^[a-z0-9-]{3,80}$/i.test(slug) || !/^[A-HJ-NP-Z2-9]{6,12}$/.test(pid)) {
    return NextResponse.redirect(`${origin}/build/${encodeURIComponent(slug)}`, 302);
  }

  const { data } = await anonClient().rpc("record_social_click", { p_slug: slug.toLowerCase(), p_public_id: pid });
  const target = typeof data === "string" ? data : null;

  if (!target || !/^https:\/\//i.test(target)) {
    return NextResponse.redirect(`${origin}/build/${slug.toLowerCase()}`, 302);
  }

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" },
  });
}

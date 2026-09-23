import { NextResponse, type NextRequest } from "next/server";

import { anonClient } from "@/lib/db/public";

export const dynamic = "force-dynamic";

/**
 * Outbound product link. Records the click and redirects to the affiliate URL
 * when configured, otherwise the product URL. The destination is validated
 * server-side (https/http only) so a stored value can never become a
 * javascript: or data: link.
 */
export async function GET(request: NextRequest, context: RouteContext<"/out/[slug]/part/[pid]">) {
  const { slug, pid } = await context.params;
  const origin = request.nextUrl.origin;

  if (!/^[a-z0-9-]{3,80}$/i.test(slug) || !/^[A-HJ-NP-Z2-9]{6,12}$/.test(pid)) {
    return NextResponse.redirect(`${origin}/build/${encodeURIComponent(slug)}`, 302);
  }

  const { data } = await anonClient().rpc("record_product_click", { p_slug: slug.toLowerCase(), p_public_id: pid });
  const target = typeof data === "string" ? data : null;

  if (!target || !/^https?:\/\//i.test(target)) {
    return NextResponse.redirect(`${origin}/build/${slug.toLowerCase()}`, 302);
  }

  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" },
  });
}

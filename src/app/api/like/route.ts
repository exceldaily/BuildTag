import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { rateLimit } from "@/lib/analytics/rate-limit";
import { getNetworkKey, getVisitorKey } from "@/lib/analytics/visitor";
import { anonClient } from "@/lib/db/public";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ slug: z.string().trim().min(3).max(80) });

/**
 * Anonymous like toggle. Abuse controls:
 *   1. per-network throttle (in-memory, per instance)
 *   2. one like per HMAC visitor key per vehicle (unique index in the DB)
 * Visitor keys are irreversible; no IP or user agent is stored.
 */
export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const network = await getNetworkKey();
  if (!rateLimit(`like:${network}`, 30, 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Slow down" }, { status: 429 });
  }

  const visitorKey = await getVisitorKey({ create: true });
  if (!visitorKey) return NextResponse.json({ ok: false, error: "Cookies are required to like" }, { status: 400 });

  const { data, error } = await anonClient().rpc("toggle_like", {
    p_slug: parsed.data.slug.toLowerCase(),
    p_visitor_key: visitorKey,
  });
  if (error) return NextResponse.json({ ok: false, error: "Could not save your like" }, { status: 500 });

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

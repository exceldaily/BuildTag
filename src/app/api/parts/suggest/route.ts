import { NextResponse, type NextRequest } from "next/server";

import { suggestParts } from "@/lib/db/vehicles";
import { getOptionalUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Part suggestions from the standardized parts catalog (future parts
 * database). Optional for the owner: a modification can stay fully custom.
 */
export async function GET(request: NextRequest) {
  const ctx = await getOptionalUser();
  if (!ctx) return NextResponse.json({ parts: [] }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 60) ?? "";
  const parts = await suggestParts(ctx.client, q);
  return NextResponse.json({ parts });
}

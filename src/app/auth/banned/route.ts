import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Ends the session of a banned account (a route handler can clear cookies; a page can't) and shows why. */
export async function GET(request: NextRequest) {
  const client = await createServerSupabaseClient();
  await client.auth.signOut();
  return NextResponse.redirect(new URL("/login?banned=1", request.nextUrl.origin));
}

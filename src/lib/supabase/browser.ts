"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

export type BrowserClient = SupabaseClient<Database, "buildtag">;

let client: BrowserClient | null = null;

/** Singleton browser client (auth flows + owner-side realtime-free reads). */
export function getBrowserSupabase(): BrowserClient {
  if (client) return client;
  client = createBrowserClient<Database, "buildtag">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "buildtag" } },
  );
  return client;
}

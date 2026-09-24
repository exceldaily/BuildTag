import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Crew, Database, LeaderboardRow, Plan, PublicBuildListRow, PublicBuildResult } from "@/lib/types";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Public read model. The anon role has no table privileges: these calls hit
 * the `public_builds` view and security-definer functions only.
 */

/** Cookie-free anon client for public, cacheable reads (sitemap, explore). */
export function anonClient() {
  const env = publicEnv();
  return createClient<Database, "buildtag">(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    db: { schema: "buildtag" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getPublicBuild(slug: string, visitorKey: string | null): Promise<PublicBuildResult> {
  // Session-aware so owners and admins can preview private/disabled builds.
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("get_public_build", {
    p_slug: slug.toLowerCase(),
    p_visitor_key: visitorKey,
  });
  if (error) {
    throw new Error(`get_public_build failed: ${error.message}`);
  }
  return (data ?? { access: "not_found" }) as PublicBuildResult;
}

export type ExploreSort = "newest" | "scanned" | "liked" | "power";

export interface ExploreFilters {
  make?: string;
  model?: string;
  minHp?: number;
  maxHp?: number;
  sort?: ExploreSort;
  page?: number;
  pageSize?: number;
}

export interface ExploreResult {
  builds: PublicBuildListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function exploreBuilds(filters: ExploreFilters): Promise<ExploreResult> {
  const client = anonClient();
  const pageSize = Math.min(Math.max(filters.pageSize ?? 24, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * pageSize;

  let query = client.from("public_builds").select("*", { count: "exact" });

  if (filters.make) query = query.ilike("make", `%${filters.make}%`);
  if (filters.model) query = query.ilike("model", `%${filters.model}%`);
  if (filters.minHp !== undefined) query = query.gte("horsepower", filters.minHp);
  if (filters.maxHp !== undefined) query = query.lte("horsepower", filters.maxHp);

  switch (filters.sort) {
    case "scanned":
      query = query.order("scan_count", { ascending: false });
      break;
    case "liked":
      query = query.order("like_count", { ascending: false });
      break;
    case "power":
      query = query.order("horsepower", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(`explore failed: ${error.message}`);
  return { builds: (data ?? []) as PublicBuildListRow[], total: count ?? 0, page, pageSize };
}

export async function listPublicMakes(): Promise<string[]> {
  const client = anonClient();
  const { data } = await client.from("public_builds").select("make").order("make").limit(500);
  const set = new Set<string>();
  for (const row of data ?? []) set.add(row.make);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function listSitemapBuilds(): Promise<{ slug: string; updated_at: string }[]> {
  const client = anonClient();
  const { data } = await client.from("public_builds").select("slug, updated_at").order("updated_at", { ascending: false }).limit(5000);
  return (data ?? []) as { slug: string; updated_at: string }[];
}

export async function featuredBuilds(limit = 6): Promise<PublicBuildListRow[]> {
  const client = anonClient();
  const { data } = await client.from("public_builds").select("*").order("scan_count", { ascending: false }).limit(limit);
  return (data ?? []) as PublicBuildListRow[];
}

export type LeaderboardPeriod = "all" | "month" | "week" | "day";

/** Most scanned public builds for a period. Cache-friendly (anon client). */
export async function scanLeaderboard(period: LeaderboardPeriod, limit = 25): Promise<LeaderboardRow[]> {
  const { data, error } = await anonClient().rpc("scan_leaderboard", { p_period: period, p_limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data as unknown as LeaderboardRow[];
}

/** Plan of a build's owner, for the Pro badge on the public page. */
export async function buildOwnerPlan(slug: string): Promise<Plan> {
  const { data } = await anonClient().rpc("build_owner_plan", { p_slug: slug.toLowerCase() });
  return (data as Plan | null) ?? "free";
}

/** Public crew page payload. */
export async function getCrew(slug: string): Promise<Crew | null> {
  const { data, error } = await anonClient().rpc("get_crew", { p_slug: slug.toLowerCase() });
  if (error || !data) return null;
  return data as unknown as Crew;
}

/** Crew badge for a build page, if the owner rides with one. */
export async function buildCrew(slug: string): Promise<{ name: string; slug: string } | null> {
  const { data } = await anonClient().rpc("build_crew", { p_slug: slug.toLowerCase() });
  return (data as { name: string; slug: string } | null) ?? null;
}

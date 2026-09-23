import "server-only";

import type { BuildTagClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";

export interface PlanLimits {
  vehicles: number;
  photos: number;
  designs: number;
}

/** Mirrors buildtag.plan_limits() in the database; the DB enforces, UI informs. */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { vehicles: 1, photos: 12, designs: 5 },
  pro: { vehicles: 10, photos: 60, designs: 25 },
};

export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: ["1 vehicle", "12 photos", "Unlimited modifications", "Standard BuildTag templates", "Basic analytics"],
  pro: [
    "Up to 10 vehicles",
    "60 photos per vehicle",
    "Premium decal styles and frames",
    "Advanced analytics",
    "Build cost tools",
    "Custom colors and branding",
  ],
};

export async function getUserPlan(client: BuildTagClient, userId: string): Promise<Plan> {
  const { data } = await client.rpc("user_plan", { p_user_id: userId });
  return (data as Plan | null) ?? "free";
}

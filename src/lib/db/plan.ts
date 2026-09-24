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
  free: ["1 vehicle", "12 photos", "5 saved decal designs", "Unlimited modifications and affiliate links", "Scan and click analytics"],
  pro: ["Up to 10 vehicles", "60 photos per vehicle", "25 saved decal designs", "Start a crew and add members", "Pro badge on your build page", "Priority support"],
};

/** Pro pricing in USD. Keep in sync with the Stripe prices behind STRIPE_PRICE_PRO_*. */
export const PRO_PRICING = { monthly: 5, yearly: 50 } as const;

/** Limits that apply to a vehicle: its owner's plan, or pro while a business manages it unclaimed (0014). */
export async function getVehiclePlan(client: BuildTagClient, vehicle: { owner_id: string | null }): Promise<Plan> {
  return vehicle.owner_id ? getUserPlan(client, vehicle.owner_id) : "pro";
}

export async function getUserPlan(client: BuildTagClient, userId: string): Promise<Plan> {
  const { data } = await client.rpc("user_plan", { p_user_id: userId });
  return (data as Plan | null) ?? "free";
}

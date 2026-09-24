"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { VEHICLE_CLAIM_CONFIRMATION_VERSION } from "@/lib/legal/config";
import { recordAcceptance } from "@/lib/legal/status";
import { requireProfile } from "@/lib/supabase/server";
import type { ClaimResult } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

const claimInput = z.union([
  z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/) }),
  z.object({ code: z.string().trim().min(8).max(20) }),
]);

/**
 * Claims a business-created build for the signed-in user. The database does
 * all the checks atomically (0014 claim_vehicle); this only validates shape.
 */
export async function claimVehicleAction(input: { token: string } | { code: string }, confirmed: boolean): Promise<ClaimResult> {
  const parsed = claimInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  // The claimant must affirmatively confirm authority (checkbox in the dialog).
  if (confirmed !== true) return { ok: false, error: "unconfirmed" };
  const { client } = await requireProfile();
  const { data, error } = await client.rpc("claim_vehicle", {
    p_token: "token" in parsed.data ? parsed.data.token : null,
    p_code: "code" in parsed.data ? parsed.data.code : null,
  });
  if (error || !data) return { ok: false, error: "invalid" };
  const result = data as unknown as ClaimResult;
  if (result.ok) {
    await recordAcceptance(client, {
      type: "vehicle_claim_confirmation",
      version: VEHICLE_CLAIM_CONFIRMATION_VERSION,
      context: "vehicle_claim",
      subjectType: "vehicle",
      subjectId: result.vehicle_id,
      related: { method: "token" in parsed.data ? "link" : "code" },
    });
    revalidatePath("/dashboard", "layout");
    revalidatePath(`/build/${result.slug}`);
  }
  return result;
}

/** Join a business community (shop / dealership crew). Personal-crew rules stay in crews.ts. */
export async function joinBusinessCrewAction(crewId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(crewId).success) return { ok: false, error: "Invalid crew." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("join_crew", { p_crew_id: crewId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crew");
  return { ok: true, data: undefined };
}

export async function leaveBusinessCrewAction(crewId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(crewId).success) return { ok: false, error: "Invalid crew." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("leave_crew", { p_crew_id: crewId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crew");
  return { ok: true, data: undefined };
}

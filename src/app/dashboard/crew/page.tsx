import type { Metadata } from "next";

import { getUserPlan } from "@/lib/db/plan";
import { requireProfile } from "@/lib/supabase/server";
import type { Crew } from "@/lib/types";
import { CrewPanel } from "@/components/dashboard/crew-panel";
import { crewInviteUrl } from "@/lib/crew-invite";

export const metadata: Metadata = { title: "Crew", robots: { index: false } };

export default async function CrewPage() {
  const { client, user } = await requireProfile("/dashboard/crew");
  const [plan, crewRes] = await Promise.all([getUserPlan(client, user.id), client.rpc("my_crew")]);
  const crew = (crewRes.data as Crew | null) ?? null;
  // Only the owner of a Pro crew has an invite link.
  const isOwner = crew?.members.some((m) => m.user_id === user.id && m.role === "owner") ?? false;
  let inviteUrl: string | null = null;
  if (isOwner && plan === "pro") {
    const { data: code } = await client.rpc("crew_invite", { p_reset: false });
    if (typeof code === "string") inviteUrl = crewInviteUrl(code);
  }
  return (
    <div>
      <p className="eyebrow">Ride together</p>
      <h1 className="mt-2 text-4xl sm:text-5xl xl:text-6xl">Crew</h1>
      <div className="mt-8">
        <CrewPanel crew={crew} userId={user.id} isPro={plan === "pro"} inviteUrl={inviteUrl} />
      </div>
    </div>
  );
}

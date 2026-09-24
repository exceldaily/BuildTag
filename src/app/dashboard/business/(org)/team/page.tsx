import type { Metadata } from "next";

import { requireBusiness } from "@/lib/db/business";
import type { OrgTeamMember } from "@/lib/types";
import { TeamManager } from "@/components/business/team-manager";

export const metadata: Metadata = { title: "Business team", robots: { index: false } };

export default async function BusinessTeamPage() {
  const { client, org, user } = await requireBusiness();
  const { data, error } = await client.rpc("org_team", { p_org: org.id });
  if (error) throw new Error(error.message);
  const team = (data as unknown as OrgTeamMember[]) ?? [];

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl">
        Team <span className="text-muted-foreground">{team.length}</span>
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">Everyone here can work on {org.name}&apos;s builds. Their personal garages stay separate.</p>
      <div className="mt-6">
        <TeamManager orgId={org.id} team={team} myRole={org.role} myUserId={user.id} />
      </div>
    </div>
  );
}

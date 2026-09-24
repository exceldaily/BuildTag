import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireProfile, type ProfileContext } from "@/lib/supabase/server";
import type { BuildTagClient } from "@/lib/supabase/server";
import type { MyOrganization, OrgMemberRole } from "@/lib/types";

/** Cookie holding the business the member last switched to. Only a preference: every call re-checks membership. */
export const ACTIVE_ORG_COOKIE = "bt_org";

const RANK: Record<OrgMemberRole, number> = { staff: 1, manager: 2, admin: 3, owner: 4 };

export function roleAtLeast(role: OrgMemberRole, min: OrgMemberRole) {
  return RANK[role] >= RANK[min];
}

export async function listMyOrganizations(client: BuildTagClient): Promise<MyOrganization[]> {
  const { data, error } = await client.rpc("my_organizations");
  if (error) throw new Error(error.message);
  return (data as unknown as MyOrganization[] | null) ?? [];
}

export interface BusinessContext extends ProfileContext {
  orgs: MyOrganization[];
  org: MyOrganization;
  /** Active (not pending/suspended): can create builds, claims and crews. */
  canWork: boolean;
}

/**
 * Signed-in member of at least one business, with the active business
 * resolved. Sends non-members to registration. Authorization for every
 * write is still the database (org_can_work / is_org_member).
 */
export async function requireBusiness(min: OrgMemberRole = "staff"): Promise<BusinessContext> {
  const ctx = await requireProfile("/dashboard/business");
  const orgs = await listMyOrganizations(ctx.client);
  if (orgs.length === 0) redirect("/dashboard/business/register");
  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const org = orgs.find((o) => o.id === wanted) ?? orgs[0];
  if (!roleAtLeast(org.role, min)) redirect("/dashboard/business?error=role");
  return { ...ctx, orgs, org, canWork: org.status === "active" };
}

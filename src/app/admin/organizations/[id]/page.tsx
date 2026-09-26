import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/supabase/server";
import { ORGANIZATION_TYPE_LABEL, type AdminOrganizationDetail, type OrgAnalytics } from "@/lib/types";
import { uuid } from "@/lib/validation/common";
import { OrganizationMembers } from "@/components/admin/organization-members";
import { BusinessAnalyticsView, parseAnalyticsDays } from "@/components/business/business-analytics-view";

export const metadata: Metadata = { title: "Business", robots: { index: false } };

export default async function AdminOrganizationPage({ params, searchParams }: PageProps<"/admin/organizations/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const days = parseAnalyticsDays(sp.days);
  const { client, user, profile } = await requireAdmin();
  const [detail, analytics] = await Promise.all([
    client.rpc("admin_organization_detail", { p_org: id }),
    client.rpc("org_analytics", { p_org: id, p_days: days }),
  ]);
  if (detail.error) throw new Error(detail.error.message);
  if (!detail.data) notFound();
  const org = detail.data as unknown as AdminOrganizationDetail;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/organizations" className="label-tech hover:text-foreground">
          ← Businesses
        </Link>
        <h1 className="mt-2 text-4xl">{org.name}</h1>
        <p className="label-tech mt-2">
          {ORGANIZATION_TYPE_LABEL[org.organization_type]} · {org.status} · {org.verified_status}
          {org.status === "active" && (
            <>
              {" · "}
              <Link href={`/org/${org.slug}`} target="_blank" className="hover:text-foreground">
                Public page ↗
              </Link>
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {[org.email, org.phone, org.location_text].filter(Boolean).join(" · ") || "No contact details"} · Created {new Date(org.created_at).toLocaleDateString()}
        </p>
      </div>

      <OrganizationMembers org={org} myUserId={user.id} myIdentifier={profile.username ? `@${profile.username}` : (user.email ?? "")} />

      <section>
        <h2 className="text-2xl">Analytics</h2>
        {analytics.error ? (
          <p className="mt-3 text-sm text-muted-foreground">{analytics.error.message}</p>
        ) : (
          <div className="mt-4">
            <BusinessAnalyticsView data={analytics.data as unknown as OrgAnalytics} hrefFor={(d) => `/admin/organizations/${org.id}?days=${d}`} />
          </div>
        )}
      </section>
    </div>
  );
}

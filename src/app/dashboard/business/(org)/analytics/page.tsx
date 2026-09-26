import type { Metadata } from "next";

import { requireBusiness } from "@/lib/db/business";
import type { OrgAnalytics } from "@/lib/types";
import { BusinessAnalyticsView, parseAnalyticsDays } from "@/components/business/business-analytics-view";

export const metadata: Metadata = { title: "Business analytics", robots: { index: false } };

export default async function BusinessAnalyticsPage({ searchParams }: PageProps<"/dashboard/business/analytics">) {
  const sp = await searchParams;
  const days = parseAnalyticsDays(sp.days);
  const { client, org } = await requireBusiness();
  const { data, error } = await client.rpc("org_analytics", { p_org: org.id, p_days: days });
  if (error) throw new Error(error.message);

  return (
    <div>
      <h2 className="text-2xl">Analytics</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        How the builds {org.name} worked on are getting scanned, and which of the parts you installed people tap through to.
      </p>
      <div className="mt-6">
        <BusinessAnalyticsView data={data as unknown as OrgAnalytics} hrefFor={(d) => `/dashboard/business/analytics?days=${d}`} />
      </div>
    </div>
  );
}

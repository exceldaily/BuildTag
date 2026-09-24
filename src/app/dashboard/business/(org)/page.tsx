import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { requireBusiness } from "@/lib/db/business";
import type { OrgDashboard } from "@/lib/types";
import { formatCount, vehicleTitle } from "@/lib/utils";
import { StatTile } from "@/components/dashboard/stat-tile";

export const metadata: Metadata = { title: "Business", robots: { index: false } };

const STATUS_LABEL = { unclaimed: "Not claimed", claim_pending: "Claim sent", claimed: "Claimed", transfer_pending: "Transfer pending" } as const;

export default async function BusinessOverviewPage({ searchParams }: PageProps<"/dashboard/business">) {
  const sp = await searchParams;
  const { client, org, canWork } = await requireBusiness();
  const { data, error } = await client.rpc("org_dashboard", { p_org: org.id });
  if (error) throw new Error(error.message);
  const d = data as unknown as OrgDashboard;

  return (
    <div className="space-y-10">
      {sp.registered === "1" && (
        <p className="rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-sm">
          {org.name} is registered. Finish your profile under Settings, then get in touch so we can switch on the build tools.
        </p>
      )}
      {sp.error === "role" && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">Your role in {org.name} can&apos;t open that page.</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Overview</h2>
        {canWork && (
          <Link href="/dashboard/business/builds/new" className="btn-signal btn-small">
            <Plus className="size-4" aria-hidden="true" />
            Create customer build
          </Link>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        <StatTile label="Builds created" value={formatCount(d.builds_created)} />
        <StatTile label="Claimed by customers" value={formatCount(d.claimed)} />
        <StatTile label="Awaiting claim" value={formatCount(d.awaiting_claim)} hint={d.active_claims ? `${d.active_claims} claim links out` : undefined} />
        <StatTile label="Parts documented" value={formatCount(d.documented_mods)} />
        <StatTile label="BuildTags ordered" value={formatCount(d.buildtags_ordered)} />
        <StatTile label="Active BuildTags" value={formatCount(d.active_buildtags)} />
        <StatTile label="Scans on your builds" value={formatCount(d.total_scans)} />
        <StatTile label="Claim rate" value={d.builds_created ? `${Math.round((d.claimed / d.builds_created) * 100)}%` : "—"} />
      </dl>

      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <h3 className="text-xl">Recent builds</h3>
          {d.recent_builds.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No builds yet. {canWork ? "Create one for the next vehicle that leaves your shop." : "Build tools switch on once your business is active."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {d.recent_builds.map((b) => (
                <li key={b.vehicle_id}>
                  <Link href={`/dashboard/business/builds/${b.vehicle_id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-white/5">
                    <span className="min-w-0 truncate text-sm">{b.nickname || vehicleTitle(b)}</span>
                    <span className="label-tech shrink-0">{STATUS_LABEL[b.ownership_status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-xl">Recent claims</h3>
          {d.recent_claims.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">When a customer claims a build it shows up here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {d.recent_claims.map((c) => (
                <li key={c.vehicle_id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <Link href={`/build/${c.slug}`} className="min-w-0 truncate hover:underline">
                    {vehicleTitle(c)}
                  </Link>
                  <span className="label-tech shrink-0">{new Date(c.claimed_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-xl">Most scanned</h3>
          {d.top_scanned.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Scan counts show once BuildTags are on vehicles.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {d.top_scanned.map((b) => (
                <li key={b.vehicle_id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <Link href={`/build/${b.slug}`} className="min-w-0 truncate hover:underline">
                    {b.nickname || vehicleTitle(b)}
                  </Link>
                  <span className="label-tech shrink-0">{formatCount(b.scan_count)} scans</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

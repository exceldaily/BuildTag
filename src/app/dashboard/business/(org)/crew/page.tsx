import type { Metadata } from "next";
import Link from "next/link";

import { requireBusiness, roleAtLeast } from "@/lib/db/business";
import { getCrew } from "@/lib/db/public";
import type { CrewKind, OrgBuild } from "@/lib/types";
import { formatCount, vehicleTitle } from "@/lib/utils";
import { CrewToggle } from "@/components/business/crew-toggle";
import { OrgCrewForm } from "@/components/business/org-crew-form";

export const metadata: Metadata = { title: "Business crew", robots: { index: false } };

export default async function BusinessCrewPage() {
  const { client, org, canWork } = await requireBusiness();
  const { data: row } = await client.from("crews").select("id, name, slug, tagline, kind").eq("organization_id", org.id).maybeSingle();
  const crewRow = row as { id: string; name: string; slug: string; tagline: string; kind: CrewKind } | null;
  const [crew, buildsRes] = await Promise.all([crewRow ? getCrew(crewRow.slug) : null, client.rpc("org_builds", { p_org: org.id })]);
  const builds = (buildsRes.data as unknown as OrgBuild[]) ?? [];
  const isAdmin = roleAtLeast(org.role, "admin");

  return (
    <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl">{crewRow ? crewRow.name : "Start your crew"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your crew is where every build you touched lives together, and where your customers can join as riders. Builds you add show on
            the crew page and leaderboard. Customers choose to join; nobody is added automatically.
          </p>
        </div>
        {crewRow && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/crew/${crewRow.slug}`} className="btn-ghost btn-small" target="_blank" rel="noopener">
              View crew page
            </Link>
          </div>
        )}
        {crew && (
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <div className="bg-surface px-4 py-3">
              <dt className="label-tech">Members</dt>
              <dd className="stat-number mt-1">{crew.members.length}</dd>
            </div>
            <div className="bg-surface px-4 py-3">
              <dt className="label-tech">Builds</dt>
              <dd className="stat-number mt-1">{crew.builds.length}</dd>
            </div>
            <div className="bg-surface px-4 py-3">
              <dt className="label-tech">Scans</dt>
              <dd className="stat-number mt-1">{formatCount(crew.total_scans)}</dd>
            </div>
          </dl>
        )}
        {isAdmin && canWork ? (
          <div className="panel p-5">
            <OrgCrewForm orgId={org.id} crew={crewRow} defaultName={org.name} />
          </div>
        ) : !crewRow ? (
          <p className="text-sm text-muted-foreground">{canWork ? "An owner or admin of the business can start the crew." : "Crews switch on once your business is active."}</p>
        ) : null}
      </section>

      {crewRow && (
        <section>
          <h3 className="text-xl">Builds in the crew</h3>
          {builds.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No builds yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {builds.map((b) => (
                <li key={b.vehicle_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.nickname || vehicleTitle(b)}</p>
                    <p className="label-tech truncate">{b.nickname ? vehicleTitle(b) : b.trim || "—"}</p>
                  </div>
                  {canWork ? <CrewToggle orgId={org.id} crew={crewRow} vehicleId={b.vehicle_id} inCrew={b.in_crew} /> : <span className="label-tech">{b.in_crew ? "In crew" : ""}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

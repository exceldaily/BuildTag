import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { requireBusiness } from "@/lib/db/business";
import { RELATIONSHIP_LABEL, type OrgBuild } from "@/lib/types";
import { formatCount, vehicleTitle } from "@/lib/utils";

export const metadata: Metadata = { title: "Business builds", robots: { index: false } };

function claimState(b: OrgBuild): { label: string; tone: "muted" | "signal" | "cyan" } {
  if (b.ownership_status === "claimed" || !b.can_edit) return { label: "Claimed", tone: "cyan" };
  if (b.claim?.status === "active") return { label: b.claim.invite_sent_at ? "Invite sent" : "Claim link ready", tone: "signal" };
  if (b.claim?.status === "expired") return { label: "Claim expired", tone: "muted" };
  return { label: "Not claimed", tone: "muted" };
}

const TONE = {
  muted: "border-line text-muted-foreground",
  signal: "border-signal/50 bg-signal/10 text-signal",
  cyan: "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan",
};

export default async function BusinessBuildsPage() {
  const { client, org, canWork } = await requireBusiness();
  const { data, error } = await client.rpc("org_builds", { p_org: org.id });
  if (error) throw new Error(error.message);
  const builds = (data as unknown as OrgBuild[]) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">
          Builds <span className="text-muted-foreground">{builds.length}</span>
        </h2>
        {canWork && (
          <Link href="/dashboard/business/builds/new" className="btn-signal btn-small">
            <Plus className="size-4" aria-hidden="true" />
            Create customer build
          </Link>
        )}
      </div>

      {builds.length === 0 ? (
        <div className="panel mt-6 p-6">
          <p className="font-display text-xl font-bold uppercase">No builds yet</p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Create a build page for a customer&apos;s vehicle, record the parts you installed, then hand it off with a claim link. Builds your
            business is credited on (as installer or tuner) show up here too.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {builds.map((b) => {
            const state = claimState(b);
            return (
              <li key={b.vehicle_id} className="panel flex gap-3 p-3">
                <div className="size-24 shrink-0 overflow-hidden rounded-md bg-surface-2">
                  {b.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.hero_image_url} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex size-full items-center justify-center label-tech">No photo</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-display text-lg font-bold uppercase">{b.nickname || b.model}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {vehicleTitle(b)}
                    {b.customer_name ? ` · ${b.customer_name}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] uppercase ${TONE[state.tone]}`}>{state.label}</span>
                    {b.roles
                      .filter((r) => r !== "creator")
                      .map((r) => (
                        <span key={r} className="rounded-full border border-line px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] uppercase">
                          {RELATIONSHIP_LABEL[r]}
                        </span>
                      ))}
                  </div>
                  <p className="label-tech mt-auto pt-2">
                    {b.org_mod_count} parts by you · {formatCount(b.scan_count)} scans{b.qr_code ? ` · ${b.qr_code}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Link href={`/dashboard/business/builds/${b.vehicle_id}`} className="btn-ghost btn-small">
                    Manage
                  </Link>
                  {b.can_edit && (
                    <Link href={`/dashboard/vehicles/${b.vehicle_id}`} className="btn-ghost btn-small">
                      Edit
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

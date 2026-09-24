import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireBusiness } from "@/lib/db/business";
import { siteUrl } from "@/lib/env";
import { RELATIONSHIP_LABEL, type OrgBuild } from "@/lib/types";
import { formatCount, vehicleTitle } from "@/lib/utils";
import { ClaimManager } from "@/components/business/claim-manager";
import { CrewToggle } from "@/components/business/crew-toggle";
import { CustomerRecordForm, type CustomerRecord } from "@/components/business/customer-record-form";

export const metadata: Metadata = { title: "Build handoff", robots: { index: false } };

export default async function BusinessBuildPage({ params }: PageProps<"/dashboard/business/builds/[vehicleId]">) {
  const { vehicleId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(vehicleId)) notFound();
  const { client, org, canWork } = await requireBusiness();
  const [{ data, error }, { data: record }, { data: crew }] = await Promise.all([
    client.rpc("org_builds", { p_org: org.id }),
    client.from("vehicle_customer_records").select("customer_name, customer_email, customer_phone, notes").eq("vehicle_id", vehicleId).eq("organization_id", org.id).maybeSingle(),
    client.from("crews").select("id, name").eq("organization_id", org.id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  const build = ((data as unknown as OrgBuild[]) ?? []).find((b) => b.vehicle_id === vehicleId);
  if (!build) notFound();

  const title = vehicleTitle(build);
  const claimed = !build.can_edit;
  const host = new URL(siteUrl()).host;
  // only the business that manages the build (creator/builder/dealer) hands it off
  const manages = build.roles.some((r) => r === "creator" || r === "builder" || r === "dealer");

  return (
    <div className="space-y-6">
      <Link href="/dashboard/business/builds" className="label-tech hover:text-foreground">
        ← Builds
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {title}
            {build.trim ? ` ${build.trim}` : ""}
          </p>
          <h2 className="truncate text-4xl leading-none">{build.nickname || build.model}</h2>
          <p className="label-tech mt-2">
            {build.roles.map((r) => RELATIONSHIP_LABEL[r]).join(" · ")} · {build.org_mod_count} parts by {org.name} · {formatCount(build.scan_count)} scans
            {build.qr_code ? ` · QR ${build.qr_code}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/build/${build.slug}`} className="btn-ghost btn-small" target="_blank" rel="noopener">
            View build
          </Link>
          {build.can_edit && (
            <>
              <Link href={`/dashboard/vehicles/${build.vehicle_id}`} className="btn-ghost btn-small">
                Edit build
              </Link>
              <Link href={`/dashboard/vehicles/${build.vehicle_id}/tag-designer`} className="btn-signal btn-small">
                Design BuildTag
              </Link>
            </>
          )}
          {crew && canWork && <CrewToggle orgId={org.id} crew={crew} vehicleId={build.vehicle_id} inCrew={build.in_crew} />}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {manages ? (
          <ClaimManager
            vehicleId={build.vehicle_id}
            vehicleLabel={build.nickname || title}
            vehicleSub={build.nickname ? title : build.trim}
            orgName={org.name}
            claim={build.claim}
            claimed={claimed}
            defaultEmail={(record as CustomerRecord | null)?.customer_email ?? ""}
            claimHost={host}
          />
        ) : (
          <div className="panel p-5 text-sm text-muted-foreground">
            {org.name} is credited on this build. The business that manages it handles the customer handoff.
          </div>
        )}
        <CustomerRecordForm orgId={org.id} vehicleId={build.vehicle_id} record={(record as CustomerRecord | null) ?? null} />
      </div>
    </div>
  );
}

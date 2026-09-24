import Link from "next/link";

import { getManagedVehicle } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { vehicleTitle } from "@/lib/utils";
import { VehicleSectionNav } from "@/components/dashboard/vehicle-section-nav";

export default async function VehicleLayout({ children, params }: LayoutProps<"/dashboard/vehicles/[id]">) {
  const { id } = await params;
  const { client, user } = await requireProfile(`/dashboard/vehicles/${id}`);
  const { vehicle, organization } = await getManagedVehicle(client, id, user.id);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href={organization ? "/dashboard/business/builds" : "/dashboard"} className="label-tech hover:text-foreground">
            {organization ? `← ${organization.name} builds` : "← Garage"}
          </Link>
          <p className="mt-3 font-display text-base font-semibold tracking-[0.1em] text-muted-foreground uppercase">{vehicleTitle(vehicle)}</p>
          <h1 className="truncate text-4xl leading-none sm:text-5xl">{vehicle.nickname || vehicle.model}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/build/${vehicle.slug}`} className="btn-ghost btn-small" target="_blank" rel="noopener">
            View build
          </Link>
          <Link href={`/dashboard/vehicles/${vehicle.id}/tag-designer`} className="btn-signal btn-small">
            Design BuildTag
          </Link>
        </div>
      </div>
      {organization && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-signal/40 bg-signal/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="label-tech text-signal">Business build</span>{" "}
            <span className="text-muted-foreground">
              You&apos;re editing for {organization.name}.{" "}
              {vehicle.ownership_status === "claim_pending" ? "A claim link is out to the customer." : "Not claimed yet."} Parts you add stay credited to your shop after the customer claims it.
            </span>
          </p>
          <Link href={`/dashboard/business/builds/${vehicle.id}`} className="btn-ghost btn-small shrink-0">
            Claim &amp; handoff
          </Link>
        </div>
      )}
      <VehicleSectionNav vehicleId={vehicle.id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

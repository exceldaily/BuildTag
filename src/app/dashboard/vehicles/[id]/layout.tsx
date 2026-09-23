import Link from "next/link";

import { getOwnedVehicle } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { vehicleTitle } from "@/lib/utils";
import { VehicleSectionNav } from "@/components/dashboard/vehicle-section-nav";

export default async function VehicleLayout({ children, params }: LayoutProps<"/dashboard/vehicles/[id]">) {
  const { id } = await params;
  const { client } = await requireProfile(`/dashboard/vehicles/${id}`);
  const vehicle = await getOwnedVehicle(client, id);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/dashboard" className="label-tech hover:text-foreground">
            ← Garage
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
      <VehicleSectionNav vehicleId={vehicle.id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

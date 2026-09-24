import type { Metadata } from "next";

import { getManagedVehicle, listModifications, listOrganizations } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { ModificationsManager } from "@/components/dashboard/modifications-manager";

export const metadata: Metadata = { title: "Modifications", robots: { index: false } };

export default async function ModificationsPage({ params }: PageProps<"/dashboard/vehicles/[id]/modifications">) {
  const { id } = await params;
  const { client, user } = await requireProfile();
  const [{ vehicle, organization }, mods, shops] = await Promise.all([
    getManagedVehicle(client, id, user.id),
    listModifications(client, id),
    listOrganizations(client),
  ]);
  return <ModificationsManager vehicleId={vehicle.id} modifications={mods} shops={shops} actingOrg={organization} />;
}

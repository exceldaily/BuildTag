import type { Metadata } from "next";

import { getOwnedVehicle, listModifications, listShops } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { ModificationsManager } from "@/components/dashboard/modifications-manager";

export const metadata: Metadata = { title: "Modifications", robots: { index: false } };

export default async function ModificationsPage({ params }: PageProps<"/dashboard/vehicles/[id]/modifications">) {
  const { id } = await params;
  const { client } = await requireProfile();
  const [vehicle, mods, shops] = await Promise.all([getOwnedVehicle(client, id), listModifications(client, id), listShops(client)]);
  return <ModificationsManager vehicleId={vehicle.id} modifications={mods} shops={shops} />;
}

import type { Metadata } from "next";

import { getOwnedVehicle, listModifications } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { CostForm } from "@/components/dashboard/forms/cost-form";

export const metadata: Metadata = { title: "Build cost", robots: { index: false } };

export default async function CostPage({ params }: PageProps<"/dashboard/vehicles/[id]/cost">) {
  const { id } = await params;
  const { client } = await requireProfile();
  const [vehicle, mods] = await Promise.all([getOwnedVehicle(client, id), listModifications(client, id)]);
  const modTotal = mods.reduce((sum, m) => sum + (m.price ?? 0), 0);
  return (
    <div className="max-w-2xl">
      <CostForm vehicle={vehicle} modTotal={modTotal} />
    </div>
  );
}

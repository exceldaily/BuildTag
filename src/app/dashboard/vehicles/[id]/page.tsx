import type { Metadata } from "next";

import { getOwnedVehicle } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { OverviewForm } from "@/components/dashboard/forms/overview-form";

export const metadata: Metadata = { title: "Overview", robots: { index: false } };

export default async function OverviewPage({ params }: PageProps<"/dashboard/vehicles/[id]">) {
  const { id } = await params;
  const { client, user } = await requireProfile();
  const vehicle = await getOwnedVehicle(client, id, user.id);
  return (
    <div className="max-w-2xl xl:max-w-4xl">
      <OverviewForm vehicle={vehicle} />
    </div>
  );
}

import type { Metadata } from "next";

import { getOwnedVehicle } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { PerformanceForm } from "@/components/dashboard/forms/performance-form";

export const metadata: Metadata = { title: "Performance", robots: { index: false } };

export default async function PerformancePage({ params }: PageProps<"/dashboard/vehicles/[id]/performance">) {
  const { id } = await params;
  const { client } = await requireProfile();
  const vehicle = await getOwnedVehicle(client, id);
  return (
    <div className="max-w-2xl">
      <PerformanceForm vehicle={vehicle} />
    </div>
  );
}

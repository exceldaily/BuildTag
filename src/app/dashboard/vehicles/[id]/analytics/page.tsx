import type { Metadata } from "next";

import { getOwnedVehicle } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import type { VehicleAnalytics } from "@/lib/types";
import { AnalyticsView } from "@/components/dashboard/analytics-view";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default async function AnalyticsPage({ params }: PageProps<"/dashboard/vehicles/[id]/analytics">) {
  const { id } = await params;
  const { client, user } = await requireProfile();
  const vehicle = await getOwnedVehicle(client, id, user.id);
  const { data, error } = await client.rpc("vehicle_analytics", { p_vehicle_id: vehicle.id });
  if (error || !data) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl">Analytics unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error?.message ?? "No data yet."}</p>
      </div>
    );
  }
  return <AnalyticsView data={data as unknown as VehicleAnalytics} />;
}

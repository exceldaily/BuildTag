import type { Metadata } from "next";

import { getOwnedVehicle } from "@/lib/db/vehicles";
import { siteUrl } from "@/lib/env";
import { requireProfile } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/dashboard/forms/settings-form";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage({ params }: PageProps<"/dashboard/vehicles/[id]/settings">) {
  const { id } = await params;
  const { client, user } = await requireProfile();
  const vehicle = await getOwnedVehicle(client, id, user.id);
  return (
    <div className="max-w-2xl xl:max-w-4xl">
      <SettingsForm vehicle={vehicle} siteUrl={siteUrl()} />
    </div>
  );
}

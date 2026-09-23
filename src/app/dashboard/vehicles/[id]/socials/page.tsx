import type { Metadata } from "next";
import Link from "next/link";

import { getOwnedVehicle, listSocialLinks } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { SocialsManager } from "@/components/dashboard/socials-manager";

export const metadata: Metadata = { title: "Socials", robots: { index: false } };

export default async function SocialsPage({ params }: PageProps<"/dashboard/vehicles/[id]/socials">) {
  const { id } = await params;
  const { client, user } = await requireProfile();
  const [vehicle, vehicleLinks, ownerLinks] = await Promise.all([
    getOwnedVehicle(client, id, user.id),
    listSocialLinks(client, "vehicle", id),
    listSocialLinks(client, "profile", user.id),
  ]);
  return (
    <div className="max-w-2xl space-y-12">
      <SocialsManager
        ownerType="vehicle"
        ownerId={vehicle.id}
        links={vehicleLinks}
        title="Vehicle socials"
        description="Accounts for this car specifically. These show first on the build page and on your decal."
      />
      <div className="rounded-lg border border-line p-4 text-sm text-muted-foreground">
        Your personal accounts ({ownerLinks.length} added) live on your{" "}
        <Link href="/dashboard/profile" className="text-foreground underline">
          profile
        </Link>{" "}
        and appear in the owner section of every build you own. You can hide the owner section per vehicle in Settings.
      </div>
    </div>
  );
}

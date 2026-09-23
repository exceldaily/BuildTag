import type { Metadata } from "next";

import { PLAN_LIMITS, getUserPlan } from "@/lib/db/plan";
import { getOwnedVehicle, listPhotos } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { PhotoManager } from "@/components/dashboard/photo-manager";

export const metadata: Metadata = { title: "Photos", robots: { index: false } };

export default async function PhotosPage({ params }: PageProps<"/dashboard/vehicles/[id]/photos">) {
  const { id } = await params;
  const { client, user } = await requireProfile();
  const [vehicle, photos, plan] = await Promise.all([getOwnedVehicle(client, id, user.id), listPhotos(client, id), getUserPlan(client, user.id)]);
  return <PhotoManager vehicle={vehicle} photos={photos} limit={PLAN_LIMITS[plan].photos} />;
}

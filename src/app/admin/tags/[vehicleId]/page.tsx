import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getVehicleQr, listModifications, listSocialLinks } from "@/lib/db/vehicles";
import { siteUrl } from "@/lib/env";
import { scanUrl } from "@/lib/qr/generate";
import { requireAdmin } from "@/lib/supabase/server";
import type { TagData } from "@/lib/tag/types";
import type { PrintSpecificationRow, ProfileRow, VehicleRow } from "@/lib/types";
import { powerLabel, torqueLabel } from "@/lib/utils";
import { TagDesigner } from "@/components/designer/tag-designer";

export const metadata: Metadata = { title: "Free tag designer", robots: { index: false } };

/**
 * Admin designer: same engine as the member designer, but for any member's
 * vehicle. Approving creates a production snapshot and a paid, zero-total
 * order for that member.
 */
export default async function AdminTagDesignerPage({ params }: PageProps<"/admin/tags/[vehicleId]">) {
  const { vehicleId } = await params;
  const { client } = await requireAdmin();

  const { data: vehicleData } = await client.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (!vehicleData) notFound();
  const vehicle = vehicleData as VehicleRow;
  const ownerId = vehicle.owner_id;
  if (!ownerId) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl">Unclaimed business build</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This vehicle belongs to a business until its customer claims it. Its BuildTag is ordered from that business&apos;s dashboard.
        </p>
      </div>
    );
  }

  const [ownerRes, qr, vehicleSocials, ownerSocials, specsRes, mods] = await Promise.all([
    client.from("profiles").select("*").eq("id", ownerId).maybeSingle(),
    getVehicleQr(client, vehicle.id),
    listSocialLinks(client, "vehicle", vehicle.id),
    listSocialLinks(client, "profile", ownerId),
    client.from("print_specifications").select("*").order("sort_order"),
    listModifications(client, vehicle.id),
  ]);
  const owner = ownerRes.data as ProfileRow | null;
  if (!owner) notFound();
  if (!qr) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl">No permanent code</h2>
        <p className="mt-2 text-sm text-muted-foreground">This vehicle has no QR code row, so a tag cannot be built for it.</p>
      </div>
    );
  }

  const data: TagData = {
    scanUrl: scanUrl(siteUrl(), qr.code),
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    nickname: vehicle.nickname,
    powerLabel: powerLabel(vehicle.horsepower, vehicle.horsepower_type),
    torqueLabel: torqueLabel(vehicle.torque, vehicle.torque_unit, vehicle.horsepower_type),
    modCount: mods.length,
    username: owner.username,
    socials: [
      ...vehicleSocials.filter((s) => s.is_public && s.handle).map((s) => ({ public_id: s.public_id, platform: s.platform, handle: s.handle, source: "vehicle" as const })),
      ...ownerSocials.filter((s) => s.is_public && s.handle).map((s) => ({ public_id: s.public_id, platform: s.platform, handle: s.handle, source: "owner" as const })),
    ],
  };

  return (
    <TagDesigner
      vehicleId={vehicle.id}
      code={qr.code}
      data={data}
      plan="pro"
      printSpecs={(specsRes.data ?? []) as PrintSpecificationRow[]}
      shopLogos={[]}
      initialDesign={null}
      savedDesigns={[]}
      admin={{ userId: owner.id, username: owner.username, displayName: owner.display_name }}
    />
  );
}

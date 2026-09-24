import type { Metadata } from "next";

import { getVehiclePlan } from "@/lib/db/plan";
import { getManagedVehicle, getVehicleQr, listModifications, listOrganizations, listSocialLinks, listTagDesigns } from "@/lib/db/vehicles";
import { siteUrl } from "@/lib/env";
import { scanUrl } from "@/lib/qr/generate";
import { requireProfile } from "@/lib/supabase/server";
import { normalizeConfig } from "@/lib/tag";
import type { TagData } from "@/lib/tag/types";
import type { PrintSpecificationRow } from "@/lib/types";
import { powerLabel, torqueLabel } from "@/lib/utils";
import { TagDesigner } from "@/components/designer/tag-designer";

export const metadata: Metadata = { title: "BuildTag Designer", robots: { index: false } };

export default async function TagDesignerPage({ params, searchParams }: PageProps<"/dashboard/vehicles/[id]/tag-designer">) {
  const { id } = await params;
  const sp = await searchParams;
  const { client, user, profile } = await requireProfile();
  const managed = await getManagedVehicle(client, id, user.id);
  const { vehicle, organization } = managed;
  // On a business build the "owner" handles are the business's, never the staff member's.
  const [qr, vehicleSocials, ownerSocials, designs, plan, specsRes, shops, mods] = await Promise.all([
    getVehicleQr(client, id),
    listSocialLinks(client, "vehicle", id),
    organization ? listSocialLinks(client, "shop", organization.id) : listSocialLinks(client, "profile", user.id),
    listTagDesigns(client, id),
    getVehiclePlan(client, vehicle),
    client.from("print_specifications").select("*").order("sort_order"),
    listOrganizations(client),
    listModifications(client, id),
  ]);

  if (!qr) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl">QR generation failed</h2>
        <p className="mt-2 text-sm text-muted-foreground">This vehicle has no permanent code. Reload the page; if it persists, contact support.</p>
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
    username: organization ? "" : profile.username,
    socials: [
      ...vehicleSocials.filter((s) => s.is_public && s.handle).map((s) => ({ public_id: s.public_id, platform: s.platform, handle: s.handle, source: "vehicle" as const })),
      ...ownerSocials.filter((s) => s.is_public && s.handle).map((s) => ({ public_id: s.public_id, platform: s.platform, handle: s.handle, source: "owner" as const })),
    ],
  };

  const designParam = typeof sp.design === "string" ? sp.design : null;
  const initial = designParam ? (designs.find((d) => d.id === designParam) ?? null) : null;
  const ownedShops = shops.filter((s) => s.id);

  return (
    <TagDesigner
      vehicleId={vehicle.id}
      code={qr.code}
      data={data}
      plan={plan}
      printSpecs={(specsRes.data ?? []) as PrintSpecificationRow[]}
      shopLogos={ownedShops.map((s) => ({ id: s.id, name: s.name }))}
      initialDesign={initial ? { id: initial.id, name: initial.name, config: normalizeConfig(initial.configuration_json) } : null}
      savedDesigns={designs.map((d) => ({ id: d.id, name: d.name }))}
    />
  );
}

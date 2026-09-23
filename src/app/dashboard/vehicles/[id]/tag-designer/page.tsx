import type { Metadata } from "next";

import { getUserPlan } from "@/lib/db/plan";
import { getOwnedVehicle, getVehicleQr, listSocialLinks, listTagDesigns } from "@/lib/db/vehicles";
import { siteUrl } from "@/lib/env";
import { scanUrl } from "@/lib/qr/generate";
import { requireProfile } from "@/lib/supabase/server";
import { normalizeConfig } from "@/lib/tag";
import type { TagData } from "@/lib/tag/types";
import { powerLabel } from "@/lib/utils";
import { TagDesigner } from "@/components/designer/tag-designer";

export const metadata: Metadata = { title: "BuildTag Designer", robots: { index: false } };

export default async function TagDesignerPage({ params, searchParams }: PageProps<"/dashboard/vehicles/[id]/tag-designer">) {
  const { id } = await params;
  const sp = await searchParams;
  const { client, user } = await requireProfile();
  const [vehicle, qr, socials, designs, plan] = await Promise.all([
    getOwnedVehicle(client, id, user.id),
    getVehicleQr(client, id),
    listSocialLinks(client, "vehicle", id),
    listTagDesigns(client, id),
    getUserPlan(client, user.id),
  ]);

  if (!qr) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl">QR generation failed</h2>
        <p className="mt-2 text-sm text-muted-foreground">This vehicle has no permanent code. Reload the page; if it persists, contact support.</p>
      </div>
    );
  }

  const primarySocial = socials.find((s) => s.is_public && s.handle) ?? socials[0];
  const data: TagData = {
    scanUrl: scanUrl(siteUrl(), qr.code),
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    nickname: vehicle.nickname,
    powerLabel: powerLabel(vehicle.horsepower, vehicle.horsepower_type),
    socialHandle: primarySocial ? `@${primarySocial.handle.replace(/^@/, "")}` : "",
  };

  const designParam = typeof sp.design === "string" ? sp.design : null;
  const initial = designParam ? (designs.find((d) => d.id === designParam) ?? null) : null;

  return (
    <TagDesigner
      vehicleId={vehicle.id}
      code={qr.code}
      data={data}
      plan={plan}
      initialDesign={
        initial
          ? { id: initial.id, name: initial.name, config: normalizeConfig(initial.configuration_json) }
          : null
      }
      savedDesigns={designs.map((d) => ({ id: d.id, name: d.name }))}
    />
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { getOwnedVehicle, getVehicleQr, listTagDesigns } from "@/lib/db/vehicles";
import { siteUrl } from "@/lib/env";
import { qrSvg, scanUrl } from "@/lib/qr/generate";
import { requireProfile } from "@/lib/supabase/server";
import { QrPanel } from "@/components/dashboard/qr-panel";
import { SavedDesigns } from "@/components/dashboard/saved-designs";

export const metadata: Metadata = { title: "BuildTag", robots: { index: false } };

export default async function BuildTagPage({ params }: PageProps<"/dashboard/vehicles/[id]/buildtag">) {
  const { id } = await params;
  const { client, user } = await requireProfile();
  const [vehicle, qr, designs] = await Promise.all([getOwnedVehicle(client, id, user.id), getVehicleQr(client, id), listTagDesigns(client, id)]);

  if (!qr) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl">QR generation failed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This vehicle has no permanent code yet. That should not happen; try reloading, and contact support if it persists.
        </p>
      </div>
    );
  }

  const url = scanUrl(siteUrl(), qr.code);
  const svg = qrSvg(url, 320);

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <QrPanel code={qr.code} status={qr.status} url={url} svg={svg} scanCount={qr.scan_count} lastScannedAt={qr.last_scanned_at} />
      <div className="space-y-8">
        <div className="panel p-5 sm:p-6">
          <p className="eyebrow">BuildTag Designer</p>
          <h2 className="mt-2 text-3xl">Design the physical decal</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a template, shape and automotive style, add your power figure or handle, and download print-ready SVG or
            PNG. The QR area stays protected no matter what you change.
          </p>
          <Link href={`/dashboard/vehicles/${vehicle.id}/tag-designer`} className="btn-signal mt-5">
            Open the designer
          </Link>
        </div>
        <SavedDesigns vehicleId={vehicle.id} designs={designs} />
      </div>
    </div>
  );
}

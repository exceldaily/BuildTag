import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PLAN_LIMITS, getUserPlan } from "@/lib/db/plan";
import { getOwnedVehicle, getVehicleQr, listModifications, listPhotos, listShops, listSocialLinks } from "@/lib/db/vehicles";
import { siteUrl } from "@/lib/env";
import { qrSvg, scanUrl } from "@/lib/qr/generate";
import { requireProfile } from "@/lib/supabase/server";
import { PerformanceForm } from "@/components/dashboard/forms/performance-form";
import { ModificationsManager } from "@/components/dashboard/modifications-manager";
import { PhotoManager } from "@/components/dashboard/photo-manager";
import { SocialsManager } from "@/components/dashboard/socials-manager";
import { WIZARD_STEPS, WizardSteps, type WizardStepId } from "@/components/dashboard/wizard-steps";

export const metadata: Metadata = { title: "Set up your build", robots: { index: false } };

const COPY: Record<Exclude<WizardStepId, "vehicle">, { title: string; body: string }> = {
  photos: { title: "Photos", body: "A hero photo is the first thing anyone sees after a scan. Add it now, add more later." },
  performance: { title: "Performance", body: "Power and torque go on the build page and can go on your decal." },
  socials: { title: "Vehicle socials", body: "Accounts for this car. Your personal accounts live on your profile." },
  modifications: { title: "Modifications", body: "Type fast. Category and part name are all you need to start." },
  buildtag: { title: "Your BuildTag", body: "This permanent QR was created with your vehicle. Now design the decal around it." },
};

export default async function SetupStepPage({ params }: PageProps<"/dashboard/vehicles/[id]/setup/[step]">) {
  const { id, step } = await params;
  const stepId = step as WizardStepId;
  const idx = WIZARD_STEPS.findIndex((s) => s.id === stepId);
  if (idx <= 0) notFound();

  const { client, user } = await requireProfile();
  const vehicle = await getOwnedVehicle(client, id, user.id);
  const base = `/dashboard/vehicles/${vehicle.id}`;
  const next = WIZARD_STEPS[idx + 1];
  const nextHref = next ? `${base}/setup/${next.id}` : `${base}/buildtag`;
  const copy = COPY[stepId as Exclude<WizardStepId, "vehicle">];

  let body: React.ReactNode = null;
  if (stepId === "photos") {
    const [photos, plan] = await Promise.all([listPhotos(client, vehicle.id), getUserPlan(client, user.id)]);
    body = <PhotoManager vehicle={vehicle} photos={photos} limit={PLAN_LIMITS[plan].photos} />;
  } else if (stepId === "performance") {
    body = <PerformanceForm vehicle={vehicle} compact />;
  } else if (stepId === "socials") {
    const links = await listSocialLinks(client, "vehicle", vehicle.id);
    body = <SocialsManager ownerType="vehicle" ownerId={vehicle.id} links={links} title="Vehicle socials" description="Instagram, TikTok, YouTube for this car." />;
  } else if (stepId === "modifications") {
    const [mods, shops] = await Promise.all([listModifications(client, vehicle.id), listShops(client)]);
    body = <ModificationsManager vehicleId={vehicle.id} modifications={mods} shops={shops} />;
  } else if (stepId === "buildtag") {
    const qr = await getVehicleQr(client, vehicle.id);
    if (!qr) {
      body = <p className="text-sm text-destructive">QR generation failed. Reload this page; if it persists, contact support.</p>;
    } else {
      const url = scanUrl(siteUrl(), qr.code);
      const svg = qrSvg(url, 260);
      body = (
        <div className="grid gap-6 sm:grid-cols-[260px_1fr] sm:items-center">
          <div className="overflow-hidden rounded-md bg-white p-3" dangerouslySetInnerHTML={{ __html: svg.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"') }} />
          <div>
            <p className="label-tech">Permanent code</p>
            <p className="font-mono text-3xl tracking-[0.2em]">{qr.code}</p>
            <p className="mt-2 break-all text-xs text-muted-foreground">{url}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Scanning it opens your build at whatever URL it has at the time. Rename freely; the decal never goes stale.
            </p>
            <Link href={`${base}/tag-designer`} className="btn-signal mt-5">
              Design my BuildTag
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <WizardSteps current={stepId} />
      <p className="eyebrow mt-8">
        Step {idx + 1} of {WIZARD_STEPS.length}
      </p>
      <h2 className="mt-2 text-4xl sm:text-5xl">{copy.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
      <div className="mt-8">{body}</div>
      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
        <Link href={stepId === "buildtag" ? base : nextHref} className="btn-ghost">
          {stepId === "buildtag" ? "Go to the editor" : "Skip for now"}
        </Link>
        {stepId !== "buildtag" && (
          <Link href={nextHref} className="btn-signal">
            Continue
          </Link>
        )}
      </div>
    </div>
  );
}

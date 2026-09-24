"use client";

import { Camera, Check, Pencil, ScanLine, Users } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { joinBusinessCrewAction } from "@/lib/actions/claims";
import type { ClaimResult } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";

type Success = Extract<ClaimResult, { ok: true }>;

/** "WELCOME TO YOUR BUILD": shown right after a successful claim. */
export function ClaimWelcome({ result }: { result: Success }) {
  const { vehicle, organization: org, counts, crew } = result;
  const title = vehicleTitle(vehicle);
  const [joined, setJoined] = useState(crew?.is_member ?? false);
  const [pending, start] = useTransition();
  const base = `/dashboard/vehicles/${result.vehicle_id}`;

  return (
    <div className="animate-rise">
      <p className="eyebrow">Claimed</p>
      <h1 className="mt-3 text-5xl leading-[0.9] sm:text-7xl">
        <span className="speed-heading">Welcome to your build</span>
      </h1>
      <p className="mt-4 max-w-xl text-foreground/85">
        {vehicle.nickname ? `${vehicle.nickname}, your ${title},` : `Your ${title}`} is in your garage now. You own the page, the photos and
        what happens next.
        {org ? ` ${org.name} stays credited for the work they did.` : ""}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          {vehicle.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vehicle.hero_image_url} alt={title} className="aspect-[16/9] w-full object-cover object-[50%_70%]" />
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center bg-surface-2">
              <span className="label-tech">No photos yet</span>
            </div>
          )}
          <dl className="grid grid-cols-3 gap-px bg-line">
            <Stat label="Parts" value={counts.mods} />
            <Stat label="Shop parts" value={counts.business_mods} />
            <Stat label="Photos" value={counts.photos} />
          </dl>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl">What&apos;s next</h2>
          <NextStep href={`/build/${result.slug}`} icon={<ScanLine className="size-5" />} title="See your public page" body="Same permanent QR. Scans keep working, nothing to reprint." />
          <NextStep href={`${base}/photos`} icon={<Camera className="size-5" />} title="Add your photos" body="Make the page yours. Pick the hero shot." />
          <NextStep href={`${base}/modifications`} icon={<Pencil className="size-5" />} title="Add your own mods" body="Shop-recorded parts stay as recorded. You can hide any from the public page." />
          {crew && (
            <div className="panel flex items-center gap-3 p-4">
              <Users className="size-5 shrink-0 text-neon-cyan" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold tracking-wide uppercase">{crew.name}</p>
                <p className="text-sm text-muted-foreground">Your build is part of this community. Join to show up as a member too.</p>
              </div>
              {joined ? (
                <span className="inline-flex items-center gap-1 text-sm text-neon-cyan">
                  <Check className="size-4" aria-hidden="true" />
                  Joined
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-ghost btn-small shrink-0"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await joinBusinessCrewAction(crew.id);
                      if (!res.ok) {
                        toast.error(res.error);
                        return;
                      }
                      setJoined(true);
                      toast.success(`You're in ${crew.name}`);
                    })
                  }
                >
                  Join
                </button>
              )}
            </div>
          )}
          <Link href={base} className="btn-signal w-full">
            Open in my garage
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface px-3 py-4 text-center">
      <dd className="stat-number">{value}</dd>
      <dt className="label-tech mt-1 truncate">{label}</dt>
    </div>
  );
}

function NextStep({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="panel flex items-start gap-3 p-4 transition-colors hover:border-foreground/30">
      <span className="mt-0.5 text-signal" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="block font-display text-lg font-bold tracking-wide uppercase">{title}</span>
        <span className="block text-sm text-muted-foreground">{body}</span>
      </span>
    </Link>
  );
}

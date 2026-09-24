import { BadgeCheck, Camera, Wrench } from "lucide-react";

import { ORGANIZATION_TYPE_LABEL, type ClaimPreview } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";

/** "YOUR BUILD IS READY": what the customer sees on the private claim link. */
export function ClaimSummary({
  vehicle: v,
  organization: org,
}: {
  vehicle: NonNullable<ClaimPreview["vehicle"]>;
  organization: ClaimPreview["organization"] | null;
}) {
  const title = vehicleTitle(v);
  return (
    <div className="animate-rise">
      <p className="eyebrow">{org ? `From ${org.name}` : "BuildTag"}</p>
      <h1 className="mt-3 text-5xl leading-[0.9] sm:text-7xl">
        <span className="speed-heading">Your build is ready</span>
      </h1>
      <p className="mt-4 max-w-xl text-foreground/85">
        {org
          ? `${org.name} set up the build page for your ${title}.`
          : `Your ${title} has a build page waiting.`}{" "}
        Claim it and it&apos;s yours: the page, the photos, the parts list and
        the permanent QR.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          {v.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.hero_image_url}
              alt={title}
              className="aspect-[16/9] w-full object-cover object-[50%_70%]"
            />
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center bg-surface-2">
              <span className="label-tech">Photos coming</span>
            </div>
          )}
          <div className="p-4">
            <p className="font-display text-base font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              {title}
              {v.trim ? ` ${v.trim}` : ""}
            </p>
            {v.nickname && (
              <p className="font-display text-3xl font-bold uppercase">
                {v.nickname}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Wrench className="size-4" aria-hidden="true" />
                {v.mod_count} {v.mod_count === 1 ? "part" : "parts"} documented
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Camera className="size-4" aria-hidden="true" />
                {v.photo_count} {v.photo_count === 1 ? "photo" : "photos"}
              </span>
            </div>
          </div>
        </div>
        {org && (
          <div className="panel h-fit p-4">
            <p className="label-tech">Built by</p>
            <div className="mt-2 flex items-center gap-3">
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logo_url}
                  alt=""
                  className="size-12 rounded-md border border-line bg-surface-2 object-contain"
                />
              ) : (
                <span
                  className="flex size-12 items-center justify-center rounded-md border border-line bg-surface-2 font-display text-xl font-bold uppercase"
                  aria-hidden="true"
                >
                  {org.name.slice(0, 1)}
                </span>
              )}
              <div>
                <p className="flex items-center gap-1.5 font-display text-lg font-bold tracking-wide uppercase">
                  {org.name}
                  {org.verified_status === "verified" && (
                    <BadgeCheck
                      className="size-4 text-neon-cyan"
                      aria-label="Verified business"
                    />
                  )}
                </p>
                <p className="label-tech">
                  {ORGANIZATION_TYPE_LABEL[org.organization_type]}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              The shop keeps credit for its work after you claim. You own
              everything else.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

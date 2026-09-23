import Link from "next/link";

import type { PublicBuildListRow } from "@/lib/types";
import { formatCount, powerLabel, vehicleTitle } from "@/lib/utils";

/** Card used on Explore and the homepage. Public data only. */
export function BuildCard({ build }: { build: PublicBuildListRow }) {
  const title = vehicleTitle(build);
  const power = powerLabel(build.horsepower, build.horsepower_type);
  return (
    <Link
      href={`/build/${build.slug}`}
      className="group panel overflow-hidden transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {build.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={build.hero_image_url}
            alt={`${title}${build.nickname ? ` "${build.nickname}"` : ""}`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="label-tech">No photo yet</span>
          </div>
        )}
        {power && (
          <span className="absolute top-3 left-3 rounded bg-background/85 px-2 py-1 font-display text-sm font-bold tracking-wider">
            {power}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="label-tech">{build.year ?? ""} {build.make}</p>
        <h3 className="mt-1 text-2xl leading-tight">
          {build.nickname || build.model}
          {build.nickname && <span className="ml-2 text-base font-medium text-muted-foreground">{build.model}</span>}
        </h3>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span>
            <strong className="font-semibold text-foreground">{formatCount(build.mod_count)}</strong> mods
          </span>
          <span>
            <strong className="font-semibold text-foreground">{formatCount(build.scan_count)}</strong> scans
          </span>
          <span>
            <strong className="font-semibold text-foreground">{formatCount(build.like_count)}</strong> likes
          </span>
        </div>
      </div>
    </Link>
  );
}

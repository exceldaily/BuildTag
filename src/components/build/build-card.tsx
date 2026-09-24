import Link from "next/link";

import type { PublicBuildListRow } from "@/lib/types";
import { formatCount, powerLabel, vehicleTitle } from "@/lib/utils";

/** Card used on Explore, crews and the homepage. Public data only. Spec-sheet styling. */
export function BuildCard({ build }: { build: PublicBuildListRow }) {
  const title = vehicleTitle(build);
  const power = powerLabel(build.horsepower, build.horsepower_type);
  return (
    <Link
      href={`/build/${build.slug}`}
      className="group relative block overflow-hidden rounded-sm border border-line bg-surface transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {build.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={build.hero_image_url}
            alt={`${title}${build.nickname ? ` "${build.nickname}"` : ""}`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="label-tech">No photo yet</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        {power && <span className="absolute bottom-3 left-4 font-display text-2xl leading-none font-extrabold tracking-wide uppercase italic">{power}</span>}
        <span className="absolute top-3 right-3 h-3 w-3 border-t border-r border-signal/80" aria-hidden="true" />
      </div>
      <div className="px-4 pt-3 pb-4">
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {build.year ?? ""} {build.make}
        </p>
        <h3 className="mt-1 text-2xl leading-tight">
          {build.nickname || build.model}
          {build.nickname && <span className="ml-2 text-base font-medium text-muted-foreground">{build.model}</span>}
        </h3>
        <dl className="mt-3 grid grid-cols-3 border-t border-line pt-3 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          {[
            [build.mod_count, "Mods"],
            [build.scan_count, "Scans"],
            [build.like_count, "Likes"],
          ].map(([v, l]) => (
            <div key={l as string} className="flex flex-col-reverse">
              <dt className="mt-1">{l}</dt>
              <dd className="font-display text-lg leading-none font-bold tracking-normal text-foreground tabular-nums">{formatCount(v as number)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  );
}

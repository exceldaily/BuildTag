import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { crewLeaderboard } from "@/lib/db/public";
import { formatCount } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Crews",
  description: "BuildTag crews: groups of builders riding together, with every member's builds and combined scans on one page.",
};

export const revalidate = 60;

export default async function CrewsPage() {
  const crews = await crewLeaderboard("all", 100);

  return (
    <div className="mx-auto max-w-[1720px] px-4 py-10 sm:px-6 lg:px-10 2xl:px-16 md:py-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Ride together</p>
          <h1 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Crews</span>
          </h1>
          <p className="mt-3 max-w-xl text-foreground/80">A crew puts every member&apos;s build on one page and adds up their scans. Any Pro member can start one and add friends by username.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/leaderboard?board=crews" className="btn-ghost">
            Crew leaderboard
          </Link>
          <Link href="/dashboard/crew" className="btn-signal">
            Start a crew
          </Link>
        </div>
      </div>

      {crews.length === 0 ? (
        <div className="mt-10 rounded-sm border border-line p-10 text-center">
          <p className="text-2xl">No crews yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">Be the first. Go Pro, name your crew, add your people.</p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {crews.map((c) => (
            <li key={c.id}>
              <Link
                href={`/crew/${c.slug}`}
                className="group relative block overflow-hidden rounded-sm border border-line bg-surface transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
                  {c.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.hero_image_url} alt="" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Users className="size-10 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <span className="absolute top-3 right-3 h-3 w-3 border-t border-r border-signal/80" aria-hidden="true" />
                  <p className="absolute bottom-3 left-4 font-display text-3xl leading-none font-extrabold uppercase italic">{c.name}</p>
                </div>
                <div className="px-4 pt-3 pb-4">
                  {c.tagline && <p className="line-clamp-2 text-sm text-foreground/80">{c.tagline}</p>}
                  <dl className="mt-3 grid grid-cols-3 border-t border-line pt-3 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                    {(
                      [
                        [c.member_count, c.member_count === 1 ? "Member" : "Members"],
                        [c.build_count, c.build_count === 1 ? "Build" : "Builds"],
                        [c.scans, c.scans === 1 ? "Scan" : "Scans"],
                      ] as const
                    ).map(([v, l]) => (
                      <div key={l} className="flex flex-col-reverse">
                        <dt className="mt-1">{l}</dt>
                        <dd className="font-display text-lg leading-none font-bold tracking-normal text-foreground tabular-nums">{formatCount(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

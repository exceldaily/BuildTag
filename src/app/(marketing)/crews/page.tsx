import type { Metadata } from "next";
import Link from "next/link";
import { ScanLine, Users } from "lucide-react";

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
        <div className="panel mt-10 p-10 text-center">
          <p className="text-2xl">No crews yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">Be the first. Go Pro, name your crew, add your people.</p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {crews.map((c) => (
            <li key={c.id}>
              <Link href={`/crew/${c.slug}`} className="group panel block overflow-hidden transition-colors hover:border-foreground/30">
                <div className="relative aspect-[16/9] bg-surface-2">
                  {c.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.hero_image_url} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Users className="size-10 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <p className="absolute bottom-3 left-4 font-display text-2xl leading-none font-extrabold uppercase">{c.name}</p>
                </div>
                <div className="p-4">
                  {c.tagline && <p className="line-clamp-2 text-sm text-foreground/80">{c.tagline}</p>}
                  <dl className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <div>
                      <dt className="sr-only">Members</dt>
                      <dd className="flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden="true" />
                        {c.member_count}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Builds</dt>
                      <dd>{c.build_count} builds</dd>
                    </div>
                    <div className="ml-auto">
                      <dt className="sr-only">Scans</dt>
                      <dd className="flex items-center gap-1 font-display text-base font-bold text-neon-cyan tabular-nums">
                        <ScanLine className="size-4" aria-hidden="true" />
                        {formatCount(c.scans)}
                      </dd>
                    </div>
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

import type { Metadata } from "next";
import Link from "next/link";
import { Heart, ScanLine, Users } from "lucide-react";

import { crewLeaderboard, scanLeaderboard, type LeaderboardPeriod } from "@/lib/db/public";
import { formatCount, powerLabel, vehicleTitle } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Scan leaderboard",
  description: "The most scanned builds and crews on BuildTag: all time, this month, this week and today.",
};

export const revalidate = 60;

type Board = "builds" | "crews";

const PERIODS: { id: LeaderboardPeriod; label: string; blurb: string }[] = [
  { id: "all", label: "All time", blurb: "Every scan since the tag went on." },
  { id: "month", label: "This month", blurb: "Scans since the 1st." },
  { id: "week", label: "This week", blurb: "Scans since Monday." },
  { id: "day", label: "Today", blurb: "Scans since midnight." },
];

function parsePeriod(v: string | string[] | undefined): LeaderboardPeriod {
  const s = Array.isArray(v) ? v[0] : v;
  return PERIODS.some((p) => p.id === s) ? (s as LeaderboardPeriod) : "all";
}
function parseBoard(v: string | string[] | undefined): Board {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "crews" ? "crews" : "builds";
}
function href(board: Board, period: LeaderboardPeriod): string {
  const q = new URLSearchParams();
  if (board !== "builds") q.set("board", board);
  if (period !== "all") q.set("period", period);
  const s = q.toString();
  return s ? `/leaderboard?${s}` : "/leaderboard";
}

const rankColor = (rank: number) => (rank === 1 ? "text-neon-amber" : rank === 2 ? "text-foreground" : rank === 3 ? "text-[#d08a4a]" : "text-muted-foreground");

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const board = parseBoard(sp.board);
  const current = PERIODS.find((p) => p.id === period)!;
  const [builds, crews] = await Promise.all([board === "builds" ? scanLeaderboard(period, 50) : Promise.resolve([]), board === "crews" ? crewLeaderboard(period, 50) : Promise.resolve([])]);
  const top = board === "builds" ? (builds[0]?.scans ?? 0) : (crews[0]?.scans ?? 0);
  const empty = board === "builds" ? builds.length === 0 : crews.length === 0;

  return (
    <div className="mx-auto max-w-[1720px] px-4 py-10 sm:px-6 lg:px-10 2xl:px-16 md:py-14">
      <p className="eyebrow">Scan the build</p>
      <h1 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
        <span className="speed-heading">Most scanned</span>
      </h1>
      <p className="mt-3 max-w-xl text-foreground/80">
        {board === "crews" ? "Crews ranked by every member's scans combined. Park together, get scanned together." : "Every decal scan counts. Park somewhere busy, get scanned, climb the board. Public builds only."}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <nav aria-label="Leaderboard type" className="inline-flex rounded-md border border-line p-1">
          {(
            [
              ["builds", "Builds"],
              ["crews", "Crews"],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={href(id, period)}
              aria-current={id === board ? "page" : undefined}
              className={cn("rounded px-4 py-1.5 font-display text-sm font-bold tracking-[0.14em] uppercase transition-colors", id === board ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Leaderboard period" className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={href(board, p.id)}
              aria-current={p.id === period ? "page" : undefined}
              className={cn(
                "rounded-md border px-4 py-2 font-display text-sm font-bold tracking-[0.14em] uppercase transition-colors",
                p.id === period ? "border-signal bg-signal text-white shadow-[0_0_18px_-4px_var(--signal)]" : "border-line text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{current.blurb}</p>

      {empty ? (
        <div className="panel mt-8 p-10 text-center">
          <p className="text-2xl">
            No {board === "crews" ? "crew " : ""}scans yet {period === "all" ? "" : current.label.toLowerCase()}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{board === "crews" ? "Start a crew, add your people, get scanned together." : "Be the first. Print your tag, stick it on, get scanned."}</p>
          <Link href={board === "crews" ? "/dashboard/crew" : "/signup"} className="btn-signal mt-6">
            {board === "crews" ? "Start a crew" : "Create your build"}
          </Link>
        </div>
      ) : board === "builds" ? (
        <ol className="mt-8 divide-y divide-line overflow-hidden rounded-lg border border-line">
          {builds.map((b, i) => {
            const rank = i + 1;
            const title = vehicleTitle(b);
            const power = powerLabel(b.horsepower, b.horsepower_type);
            const pct = top ? Math.max(4, Math.round((b.scans / top) * 100)) : 0;
            return (
              <li key={b.slug} className={cn("relative bg-surface", rank <= 3 && "bg-[linear-gradient(90deg,rgba(255,45,122,0.10),transparent_55%)]")}>
                <Link href={`/build/${b.slug}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-white/5 sm:gap-5 sm:px-5">
                  <span className={cn("w-10 shrink-0 text-center font-display text-2xl font-extrabold tabular-nums sm:text-3xl", rankColor(rank))}>{rank}</span>
                  <span className="relative block size-14 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:size-16">
                    {b.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.hero_image_url} alt="" className="size-full object-cover" loading={rank <= 6 ? "eager" : "lazy"} />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-lg font-bold uppercase text-muted-foreground">{b.make.slice(0, 1)}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg leading-tight font-bold uppercase sm:text-xl">{b.nickname || title}</span>
                    <span className="block truncate text-xs text-muted-foreground sm:text-sm">
                      {b.nickname ? `${title}${b.owner_username ? " · " : ""}` : ""}{b.owner_username ? `@${b.owner_username}` : ""}
                      {power ? ` · ${power}` : ""}
                      {b.mod_count ? ` · ${b.mod_count} mods` : ""}
                    </span>
                    <span className="mt-1.5 block h-1 w-full max-w-xs overflow-hidden rounded bg-background/60">
                      <span className="block h-full bg-signal" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="flex items-center justify-end gap-1 font-display text-2xl leading-none font-extrabold tabular-nums sm:text-3xl">
                      <ScanLine className="size-4 text-neon-cyan sm:size-5" aria-hidden="true" />
                      {formatCount(b.scans)}
                    </span>
                    <span className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Heart className="size-3" aria-hidden="true" />
                      {formatCount(b.like_count)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <ol className="mt-8 divide-y divide-line overflow-hidden rounded-lg border border-line">
          {crews.map((c, i) => {
            const rank = i + 1;
            const pct = top ? Math.max(4, Math.round((c.scans / top) * 100)) : 0;
            return (
              <li key={c.id} className={cn("relative bg-surface", rank <= 3 && "bg-[linear-gradient(90deg,rgba(31,216,255,0.10),transparent_55%)]")}>
                <Link href={`/crew/${c.slug}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-white/5 sm:gap-5 sm:px-5">
                  <span className={cn("w-10 shrink-0 text-center font-display text-2xl font-extrabold tabular-nums sm:text-3xl", rankColor(rank))}>{rank}</span>
                  <span className="relative block size-14 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:size-16">
                    {c.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.hero_image_url} alt="" className="size-full object-cover" loading={rank <= 6 ? "eager" : "lazy"} />
                    ) : (
                      <span className="flex size-full items-center justify-center text-muted-foreground">
                        <Users className="size-6" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg leading-tight font-bold uppercase sm:text-xl">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground sm:text-sm">
                      {c.member_count} member{c.member_count === 1 ? "" : "s"} · {c.build_count} build{c.build_count === 1 ? "" : "s"}
                      {c.tagline ? ` · ${c.tagline}` : ""}
                    </span>
                    <span className="mt-1.5 block h-1 w-full max-w-xs overflow-hidden rounded bg-background/60">
                      <span className="block h-full bg-neon-cyan" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="flex items-center justify-end gap-1 font-display text-2xl leading-none font-extrabold tabular-nums sm:text-3xl">
                      <ScanLine className="size-4 text-neon-cyan sm:size-5" aria-hidden="true" />
                      {formatCount(c.scans)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">crew scans</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-6 text-xs text-muted-foreground">Counts refresh about once a minute. Weeks start Monday. Scans from the same phone in a row are rate limited, so spamming your own tag does not help.</p>
    </div>
  );
}

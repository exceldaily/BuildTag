import type { Metadata } from "next";
import Link from "next/link";

import { leaderboard, leaderboardCrews } from "@/lib/db/public";
import { siteUrl } from "@/lib/env";
import { BOARDS, PERIODS, boardHref, parseBoard, parsePeriod } from "@/lib/leaderboards";
import { cn, vehicleTitle } from "@/lib/utils";
import { OpenPlace, PodiumBuild, PodiumCrew, StandingBuild, StandingCrew } from "@/components/leaderboard/board-ui";

/**
 * Public leaderboards. No sign-in. Every entry comes from
 * buildtag.leaderboard / buildtag.leaderboard_crews, which only rank public,
 * active, claimed builds and never demo accounts.
 */

export async function generateMetadata({ searchParams }: PageProps<"/leaderboards">): Promise<Metadata> {
  const sp = await searchParams;
  const board = parseBoard(sp.board);
  const period = parsePeriod(sp.period, board);
  const when = PERIODS.find((p) => p.id === period)!.label.toLowerCase();
  const title = `${board.label} ${board.id === "crews" ? "" : "builds "}${board.fixedPeriod ? "" : `(${when}) `}| BuildTags leaderboards`.replace(/\s+/g, " ");
  const description = `${board.blurb} Live standings of the cars, trucks and motorcycles on BuildTags, from real scans and likes on public builds.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: boardHref(board.id, "all") },
    openGraph: { type: "website", siteName: "BuildTags", title, description, url: boardHref(board.id, period), images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "BuildTags leaderboards" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
  };
}

const TAB = "shrink-0 border-b-2 px-1 pb-3 font-display text-sm font-bold tracking-[0.14em] uppercase transition-colors sm:text-base";

export default async function LeaderboardsPage({ searchParams }: PageProps<"/leaderboards">) {
  const sp = await searchParams;
  const board = parseBoard(sp.board);
  const period = parsePeriod(sp.period, board);
  const isCrews = board.id === "crews";
  const [builds, crews] = await Promise.all([board.id === "crews" ? Promise.resolve([]) : leaderboard(board.id, period, 50), board.id === "crews" ? leaderboardCrews(period, 50) : Promise.resolve([])]);

  const count = isCrews ? crews.length : builds.length;
  const leader = isCrews ? (crews[0]?.score ?? 0) : board.metric === "likes" ? (builds[0]?.likes ?? 0) : board.metric === "score" ? (builds[0]?.score ?? 0) : (builds[0]?.scans ?? 0);
  const openPlaces = Array.from({ length: Math.max(0, 3 - count) }, (_, i) => count + i + 1);

  const origin = siteUrl().replace(/\/+$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `BuildTags leaderboard: ${board.label}`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: count,
    itemListElement: isCrews
      ? crews.slice(0, 20).map((c) => ({ "@type": "ListItem", position: c.rank, name: c.name, url: `${origin}/crew/${c.slug}` }))
      : builds.slice(0, 20).map((b) => ({ "@type": "ListItem", position: b.rank, name: [b.nickname, vehicleTitle(b)].filter(Boolean).join(" · "), url: `${origin}/build/${b.slug}` })),
  };

  return (
    <div className="mx-auto max-w-[1720px] px-4 py-10 sm:px-6 md:py-14 lg:px-10 2xl:px-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <p className="eyebrow">Leaderboards</p>
      <h1 className="mt-3 text-5xl leading-[0.9] sm:text-6xl xl:text-7xl">
        <span className="speed-heading">{board.title}</span>
      </h1>
      <p className="mt-4 max-w-2xl text-foreground/80 sm:text-lg">{board.blurb}</p>

      {/* boards */}
      <nav aria-label="Leaderboard" className="-mx-4 mt-8 flex gap-6 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:gap-8 sm:px-0">
        {BOARDS.map((b) => (
          <Link key={b.id} href={boardHref(b.id, period)} aria-current={b.id === board.id ? "page" : undefined} className={cn(TAB, b.id === board.id ? "border-signal text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {b.label}
          </Link>
        ))}
      </nav>

      {/* window */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {board.fixedPeriod ? (
          <p className="font-mono text-[11px] tracking-[0.14em] text-signal uppercase">Last 7 days</p>
        ) : (
          <nav aria-label="Time window" className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Link
                key={p.id}
                href={boardHref(board.id, p.id)}
                aria-current={p.id === period ? "page" : undefined}
                className={cn(
                  "border px-3 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors",
                  p.id === period ? "border-signal bg-signal text-white" : "border-line text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        )}
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          {count} {isCrews ? (count === 1 ? "crew" : "crews") : count === 1 ? "build" : "builds"} on the board
        </p>
      </div>

      {/* first three */}
      <ol className="mt-8 grid gap-5 md:grid-cols-3">
        {isCrews ? crews.slice(0, 3).map((c) => <PodiumCrew key={c.id} c={c} leader={leader} />) : builds.slice(0, 3).map((b) => <PodiumBuild key={b.slug} b={b} board={board} leader={leader} />)}
        {openPlaces.map((rank) => (
          <OpenPlace key={rank} rank={rank} />
        ))}
      </ol>

      {/* the rest of the field */}
      {count > 3 && (
        <ol className="mt-8 divide-y divide-line border-y border-foreground/20">
          {isCrews ? crews.slice(3).map((c) => <StandingCrew key={c.id} c={c} leader={leader} />) : builds.slice(3).map((b) => <StandingBuild key={b.slug} b={b} board={board} leader={leader} />)}
        </ol>
      )}

      {count === 0 && (
        <p className="mt-6 max-w-xl text-sm text-muted-foreground">
          Nothing on this board {period === "all" ? "yet" : `for ${PERIODS.find((p) => p.id === period)!.label.toLowerCase()}`}. The first {isCrews ? "crew" : "build"} to get {board.metric === "likes" ? "a like" : "scanned"} takes the lead.
        </p>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className="btn-signal" data-event="signup_started">
          Get your build on the board
        </Link>
        <Link href="/explore" className="btn-ghost" data-event="explore_build_clicked">
          Explore builds
        </Link>
      </div>

      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Standings use real scans and likes on public builds. Private and unlisted builds never appear, and BuildTags demo builds are not ranked. Movement compares each entry with where it stood in the window before: the previous 7 or 30 days, or a
        week ago for all time. Scans from the same phone in a row are rate limited, so scanning your own tag over and over doesn&apos;t help.
      </p>
    </div>
  );
}

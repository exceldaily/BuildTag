import Link from "next/link";
import { ArrowDown, ArrowUp, Users } from "lucide-react";

import { movement, position, type BoardBuildRow, type BoardCrewRow, type BoardDefinition, type Ranked } from "@/lib/leaderboards";
import { cn, formatCount, vehicleTitle } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Leaderboard pieces, styled as a timing board: position, movement, entry,
 * numbers, gap to the leader. Server components only.
 * ------------------------------------------------------------------------- */

const MONO = "font-mono text-[10px] leading-none tracking-[0.14em] uppercase";

/** Up, down, new or holding since the previous window. */
export function Move({ row, className }: { row: Pick<Ranked, "rank" | "prev_rank" | "is_new">; className?: string }) {
  const m = movement(row);
  if (m.kind === "new") return <span className={cn(MONO, "border border-signal/60 px-1 py-0.5 text-signal", className)}>New</span>;
  if (m.kind === "same") {
    return (
      <span className={cn(MONO, "text-foreground/40", className)} aria-label="No change">
        -
      </span>
    );
  }
  const up = m.kind === "up";
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={cn(MONO, "inline-flex items-center gap-0.5 tabular-nums", up ? "text-signal" : "text-foreground/55", className)} aria-label={`${up ? "Up" : "Down"} ${m.by}`}>
      <Icon className="size-3" aria-hidden="true" />
      {m.by}
    </span>
  );
}

function buildName(b: BoardBuildRow): string {
  return b.nickname || b.model;
}

/** The number a board ranks by, with the two raw counts beside it. */
function primary(board: BoardDefinition, b: BoardBuildRow): number {
  return board.metric === "likes" ? b.likes : board.metric === "score" ? b.score : b.scans;
}

function Photo({ src, alt, eager, className, fallback }: { src: string | null; alt: string; eager?: boolean; className?: string; fallback: React.ReactNode }) {
  return (
    <span className={cn("relative block overflow-hidden bg-surface-2", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src.replace("/full.webp", "/thumb.webp")} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      ) : (
        <span className="flex size-full items-center justify-center font-display text-3xl font-bold text-muted-foreground uppercase">{fallback}</span>
      )}
    </span>
  );
}

/** One of the first three places: the photo carries it, the position sits on top. */
export function PodiumBuild({ b, board, leader }: { b: BoardBuildRow; board: BoardDefinition; leader: number }) {
  const title = [vehicleTitle(b), b.trim].filter(Boolean).join(" ");
  const value = primary(board, b);
  const gap = leader - value;
  return (
    <li className="h-full">
      <Link href={`/build/${b.slug}`} className={cn("group flex h-full flex-col border-t-2 bg-surface", b.rank === 1 ? "border-signal" : "border-foreground/25")} data-event="explore_build_clicked">
        <div className="relative">
          <Photo src={b.hero_image_url} alt={`${title} ${b.nickname ? `"${b.nickname}"` : ""}`.trim()} eager className="aspect-[16/10] w-full" fallback={b.make.slice(0, 1)} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" aria-hidden="true" />
          <span className={cn("absolute bottom-2 left-4 font-display text-7xl leading-none font-extrabold italic tabular-nums sm:text-8xl", b.rank === 1 ? "text-signal" : "text-foreground")}>{position(b.rank)}</span>
          <Move row={b} className="absolute top-3 right-3 bg-background/85 px-1.5 py-1" />
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <p className={cn(MONO, "text-muted-foreground")}>{title}</p>
          <h3 className="mt-1.5 truncate text-3xl leading-none sm:text-4xl">{buildName(b)}</h3>
          <p className={cn(MONO, "mt-2.5 truncate pb-4 text-foreground/70")}>
            {b.owner_username ? `@${b.owner_username}` : "BuildTags"}
            {b.crew && <span className="text-signal"> · {b.crew.name}</span>}
          </p>
          <dl className="mt-auto grid grid-cols-3 border-t border-line pt-3">
            <div>
              <dt className={cn(MONO, "text-muted-foreground")}>{board.metric === "score" ? board.unit : "Scans"}</dt>
              <dd className={cn("mt-1 font-display text-2xl leading-none font-bold tabular-nums", board.metric !== "likes" && "text-signal")}>{formatCount(board.metric === "score" ? b.score : b.scans)}</dd>
            </div>
            <div className="border-l border-line pl-3">
              <dt className={cn(MONO, "text-muted-foreground")}>{board.metric === "score" ? "Scans" : "Likes"}</dt>
              <dd className={cn("mt-1 font-display text-2xl leading-none font-bold tabular-nums", board.metric === "likes" && "text-signal")}>{formatCount(board.metric === "score" ? b.scans : b.likes)}</dd>
            </div>
            <div className="border-l border-line pl-3">
              <dt className={cn(MONO, "text-muted-foreground")}>{board.metric === "score" ? "Likes" : "Gap"}</dt>
              <dd className="mt-1 font-display text-2xl leading-none font-bold tabular-nums text-foreground/80">{board.metric === "score" ? formatCount(b.likes) : gap === 0 ? "Leader" : `+${formatCount(gap)}`}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </li>
  );
}

/** An unclaimed podium place. Real, not filler: nobody holds it yet. */
export function OpenPlace({ rank }: { rank: number }) {
  return (
    <li className="h-full">
      <Link href="/signup" className="group flex h-full min-h-56 flex-col justify-between border-t-2 border-dashed border-foreground/25 p-4 transition-colors hover:border-signal sm:p-5" data-event="signup_started">
        <span className="font-display text-7xl leading-none font-extrabold text-foreground/15 italic tabular-nums transition-colors group-hover:text-signal sm:text-8xl">{position(rank)}</span>
        <span>
          <span className="block font-display text-2xl leading-none font-bold uppercase">Open place</span>
          <span className="mt-2 block text-sm text-muted-foreground">Nobody holds it yet. Tag your build and take it.</span>
        </span>
      </Link>
    </li>
  );
}

/** Places four and down: one timing line each. */
export function StandingBuild({ b, board, leader, compact = false }: { b: BoardBuildRow; board: BoardDefinition; leader: number; compact?: boolean }) {
  const title = [vehicleTitle(b), b.trim].filter(Boolean).join(" ");
  const value = primary(board, b);
  const gap = leader - value;
  return (
    <li>
      <Link href={`/build/${b.slug}`} className="group flex items-center gap-3 px-1 py-3 transition-colors hover:bg-white/[0.03] sm:gap-5 sm:px-3" data-event="explore_build_clicked">
        <span className={cn("w-10 shrink-0 font-display text-3xl leading-none font-extrabold italic tabular-nums sm:w-12 sm:text-4xl", b.rank <= 3 ? "text-signal" : "text-foreground/70")}>{position(b.rank)}</span>
        <span className="flex w-9 shrink-0 justify-center">
          <Move row={b} />
        </span>
        <Photo src={b.hero_image_url} alt="" className="size-12 shrink-0 sm:h-14 sm:w-20" fallback={b.make.slice(0, 1)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-xl leading-none font-bold uppercase sm:text-2xl">{buildName(b)}</span>
          <span className={cn(MONO, "mt-1.5 block truncate text-muted-foreground")}>
            {title}
            {b.owner_username && <span className="text-foreground/70"> · @{b.owner_username}</span>}
            {b.crew && !compact && <span className="hidden text-signal sm:inline"> · {b.crew.name}</span>}
          </span>
        </span>
        {!compact && (
          <span className="hidden w-20 shrink-0 text-right sm:block">
            <span className="block font-display text-xl leading-none font-bold tabular-nums text-foreground/80">{formatCount(board.metric === "likes" ? b.scans : b.likes)}</span>
            <span className={cn(MONO, "mt-1 block text-muted-foreground")}>{board.metric === "likes" ? "Scans" : "Likes"}</span>
          </span>
        )}
        <span className="w-20 shrink-0 text-right sm:w-24">
          <span className="block font-display text-2xl leading-none font-extrabold tabular-nums text-signal sm:text-3xl">{formatCount(value)}</span>
          <span className={cn(MONO, "mt-1 block text-muted-foreground")}>{board.unit}</span>
        </span>
        {!compact && (
          <span className="hidden w-20 shrink-0 text-right md:block">
            <span className="block font-mono text-sm tabular-nums text-foreground/70">{gap === 0 ? "Leader" : `+${formatCount(gap)}`}</span>
            <span className={cn(MONO, "mt-1 block text-muted-foreground")}>Gap</span>
          </span>
        )}
      </Link>
    </li>
  );
}

export function PodiumCrew({ c, leader }: { c: BoardCrewRow; leader: number }) {
  const gap = leader - c.score;
  return (
    <li className="h-full">
      <Link href={`/crew/${c.slug}`} className={cn("group flex h-full flex-col border-t-2 bg-surface", c.rank === 1 ? "border-signal" : "border-foreground/25")} data-event="crew_clicked">
        <div className="relative">
          <Photo src={c.hero_image_url} alt={`${c.name} crew`} eager className="aspect-[16/10] w-full" fallback={<Users className="size-8" aria-hidden="true" />} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" aria-hidden="true" />
          <span className={cn("absolute bottom-2 left-4 font-display text-7xl leading-none font-extrabold italic tabular-nums sm:text-8xl", c.rank === 1 ? "text-signal" : "text-foreground")}>{position(c.rank)}</span>
          <Move row={c} className="absolute top-3 right-3 bg-background/85 px-1.5 py-1" />
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <p className={cn(MONO, "text-muted-foreground")}>
            {c.member_count} member{c.member_count === 1 ? "" : "s"} · {c.build_count} build{c.build_count === 1 ? "" : "s"}
          </p>
          <h3 className="mt-1.5 truncate text-3xl leading-none sm:text-4xl">{c.name}</h3>
          {c.tagline && <p className="mt-2 truncate text-sm text-muted-foreground">{c.tagline}</p>}
          <dl className="mt-auto grid grid-cols-2 border-t border-line pt-3">
            <div>
              <dt className={cn(MONO, "text-muted-foreground")}>Crew scans</dt>
              <dd className="mt-1 font-display text-2xl leading-none font-bold tabular-nums text-signal">{formatCount(c.score)}</dd>
            </div>
            <div className="border-l border-line pl-3">
              <dt className={cn(MONO, "text-muted-foreground")}>Gap</dt>
              <dd className="mt-1 font-display text-2xl leading-none font-bold tabular-nums text-foreground/80">{gap === 0 ? "Leader" : `+${formatCount(gap)}`}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </li>
  );
}

export function StandingCrew({ c, leader }: { c: BoardCrewRow; leader: number }) {
  const gap = leader - c.score;
  return (
    <li>
      <Link href={`/crew/${c.slug}`} className="group flex items-center gap-3 px-1 py-3 transition-colors hover:bg-white/[0.03] sm:gap-5 sm:px-3" data-event="crew_clicked">
        <span className="w-10 shrink-0 font-display text-3xl leading-none font-extrabold text-foreground/70 italic tabular-nums sm:w-12 sm:text-4xl">{position(c.rank)}</span>
        <span className="flex w-9 shrink-0 justify-center">
          <Move row={c} />
        </span>
        <Photo src={c.hero_image_url} alt="" className="size-12 shrink-0 sm:h-14 sm:w-20" fallback={<Users className="size-5" aria-hidden="true" />} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-xl leading-none font-bold uppercase sm:text-2xl">{c.name}</span>
          <span className={cn(MONO, "mt-1.5 block truncate text-muted-foreground")}>
            {c.member_count} member{c.member_count === 1 ? "" : "s"} · {c.build_count} build{c.build_count === 1 ? "" : "s"}
          </span>
        </span>
        <span className="w-20 shrink-0 text-right sm:w-24">
          <span className="block font-display text-2xl leading-none font-extrabold tabular-nums text-signal sm:text-3xl">{formatCount(c.score)}</span>
          <span className={cn(MONO, "mt-1 block text-muted-foreground")}>Scans</span>
        </span>
        <span className="hidden w-20 shrink-0 text-right md:block">
          <span className="block font-mono text-sm tabular-nums text-foreground/70">{gap === 0 ? "Leader" : `+${formatCount(gap)}`}</span>
          <span className={cn(MONO, "mt-1 block text-muted-foreground")}>Gap</span>
        </span>
      </Link>
    </li>
  );
}

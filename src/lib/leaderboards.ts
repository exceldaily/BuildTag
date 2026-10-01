import type { HorsepowerType } from "@/lib/types";

/**
 * Public leaderboards: board and period definitions, URL handling and rank
 * movement. Pure (no server imports) so the page, the homepage preview and
 * the tests share one source of truth. Ranking itself happens in the database
 * (buildtag.leaderboard / buildtag.leaderboard_crews, migration 0022).
 */

export type BoardId = "scanned" | "liked" | "trending" | "top" | "crews";
export type BoardPeriod = "week" | "month" | "all";

export interface BoardDefinition {
  id: BoardId;
  /** Tab label. */
  label: string;
  /** Page headline. */
  title: string;
  blurb: string;
  /** Which number decides the order, and what it's called on the board. */
  metric: "scans" | "likes" | "score";
  unit: string;
  /** Trending always covers the last 7 days, so it has no period filter. */
  fixedPeriod?: BoardPeriod;
}

export const BOARDS: BoardDefinition[] = [
  { id: "scanned", label: "Most scanned", title: "Most scanned.", blurb: "Every BuildTag scan counts. Park somewhere busy, get scanned, climb the board.", metric: "scans", unit: "Scans" },
  { id: "liked", label: "Most liked", title: "Most liked.", blurb: "Likes from people who opened the build and wanted to say so.", metric: "likes", unit: "Likes" },
  { id: "trending", label: "Trending", title: "Trending.", blurb: "The builds picking up the most scans and likes in the last 7 days, against the 7 days before.", metric: "score", unit: "Pts", fixedPeriod: "week" },
  { id: "top", label: "Top builds", title: "Top builds.", blurb: "Scans and likes together. One point per scan, two per like.", metric: "score", unit: "Pts" },
  { id: "crews", label: "Top crews", title: "Top crews.", blurb: "Crews ranked by every member's scans combined. Park together, get scanned together.", metric: "scans", unit: "Scans" },
];

export const PERIODS: { id: BoardPeriod; label: string; blurb: string }[] = [
  { id: "week", label: "This week", blurb: "The last 7 days." },
  { id: "month", label: "This month", blurb: "The last 30 days." },
  { id: "all", label: "All time", blurb: "Everything since the tag went on." },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseBoard(v: string | string[] | undefined): BoardDefinition {
  const s = first(v);
  return BOARDS.find((b) => b.id === s) ?? BOARDS[0];
}

export function parsePeriod(v: string | string[] | undefined, board: BoardDefinition): BoardPeriod {
  if (board.fixedPeriod) return board.fixedPeriod;
  const s = first(v);
  return PERIODS.some((p) => p.id === s) ? (s as BoardPeriod) : "all";
}

/** Canonical link for a board and period; defaults are left out of the URL. */
export function boardHref(board: BoardId, period: BoardPeriod = "all"): string {
  const q = new URLSearchParams();
  if (board !== "scanned") q.set("board", board);
  const def = BOARDS.find((b) => b.id === board);
  if (!def?.fixedPeriod && period !== "all") q.set("period", period);
  const s = q.toString();
  return s ? `/leaderboards?${s}` : "/leaderboards";
}

export interface Ranked {
  rank: number;
  /** Rank in the previous window. Null when the entry wasn't on the board then. */
  prev_rank: number | null;
  is_new: boolean;
  score: number;
}

export interface BoardBuildRow extends Ranked {
  scans: number;
  likes: number;
  slug: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  hero_image_url: string | null;
  mod_count: number;
  horsepower: number | null;
  horsepower_type: HorsepowerType;
  owner_username: string | null;
  crew: { name: string; slug: string } | null;
}

export interface BoardCrewRow extends Ranked {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  kind: string;
  member_count: number;
  build_count: number;
  hero_image_url: string | null;
}

export type Movement = { kind: "new" } | { kind: "same" } | { kind: "up" | "down"; by: number };

/** How an entry moved since the previous window. */
export function movement(row: Pick<Ranked, "rank" | "prev_rank" | "is_new">): Movement {
  if (row.is_new || row.prev_rank === null) return { kind: "new" };
  const diff = row.prev_rank - row.rank;
  if (diff > 0) return { kind: "up", by: diff };
  if (diff < 0) return { kind: "down", by: -diff };
  return { kind: "same" };
}

/** "01", "02", ... "10", "11". */
export function position(rank: number): string {
  return String(rank).padStart(2, "0");
}

import { permanentRedirect } from "next/navigation";

/** The scan leaderboard moved to /leaderboards. Old links keep working. */
export default async function LegacyLeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = new URLSearchParams();
  if (pick(sp.board) === "crews") q.set("board", "crews");
  const period = pick(sp.period);
  if (period === "week" || period === "month") q.set("period", period);
  if (period === "day") q.set("period", "week");
  const s = q.toString();
  permanentRedirect(s ? `/leaderboards?${s}` : "/leaderboards");
}

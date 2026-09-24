import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/server";
import { MemberPlanActions } from "@/components/admin/member-plan-actions";

export const metadata: Metadata = { title: "Members", robots: { index: false } };

interface MemberRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  created_at: string;
  vehicle_count: number;
  plan: "free" | "pro";
  provider: string | null;
  status: string | null;
  current_period_end: string | null;
  note: string;
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").slice(0, 80);
  const { client } = await requireAdmin();
  const { data } = await client.rpc("admin_list_members", { p_query: q, p_limit: 100 });
  const members = (Array.isArray(data) ? data : []) as unknown as MemberRow[];
  const proCount = members.filter((m) => m.plan === "pro").length;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Members</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Grant complimentary Pro (lifetime or timed) or remove it. Stripe subscriptions are managed in Stripe. Comped Pro is never downgraded by Stripe events.
          </p>
        </div>
        <form action="/admin/members" method="get" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="username, name or email" className="field h-10 w-64" aria-label="Search members" />
          <button type="submit" className="btn-ghost h-10">
            Search
          </button>
        </form>
      </div>

      <p className="label-tech mt-6">
        {members.length} shown · {proCount} on Pro
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:label-tech">
              <th>Member</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Source</th>
              <th>Until</th>
              <th>Cars</th>
              <th>Joined</th>
              <th>Change plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.id} className="[&>td]:px-3 [&>td]:py-2 [&>td]:align-middle">
                <td>
                  <span className="block font-medium">{m.display_name || m.username}</span>
                  <span className="block text-xs text-muted-foreground">@{m.username}</span>
                </td>
                <td className="max-w-[220px] truncate text-muted-foreground">{m.email}</td>
                <td>
                  <span className={m.plan === "pro" ? "rounded-full border border-signal/50 bg-signal/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-signal uppercase" : "rounded-full border border-line px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase"}>
                    {m.plan}
                  </span>
                </td>
                <td className="text-xs text-muted-foreground">
                  {m.plan === "pro" ? (m.provider === "comp" ? "Comp" : m.provider === "stripe" ? "Stripe" : m.provider ?? "") : m.status === "canceled" ? "Ended" : ""}
                  {m.note && <span className="block max-w-[180px] truncate" title={m.note}>{m.note}</span>}
                </td>
                <td className="text-xs text-muted-foreground">{m.plan === "pro" ? (m.current_period_end ? fmt(m.current_period_end) : "Lifetime") : ""}</td>
                <td className="tabular-nums">
                  <Link href={`/admin?q=${encodeURIComponent(m.username)}`} className="underline-offset-2 hover:underline">
                    {m.vehicle_count}
                  </Link>
                </td>
                <td className="text-xs text-muted-foreground">{fmt(m.created_at)}</td>
                <td>
                  <MemberPlanActions userId={m.id} plan={m.plan} provider={m.provider} />
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No members match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

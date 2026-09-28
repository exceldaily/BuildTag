import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/server";
import { AdminRoleToggle } from "@/components/admin/admin-role-toggle";
import { MemberPlanActions } from "@/components/admin/member-plan-actions";

interface AdminRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  created_at: string;
  granted_by: string | null;
}

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
  const { client, user } = await requireAdmin();
  const [{ data }, { data: adminData }] = await Promise.all([
    client.rpc("admin_list_members", { p_query: q, p_limit: 100 }),
    client.rpc("admin_list_admins"),
  ]);
  const admins = (Array.isArray(adminData) ? adminData : []) as unknown as AdminRow[];
  const adminIds = new Set(admins.map((a) => a.user_id));
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

      <section className="mt-6 rounded-lg border border-line p-4">
        <h2 className="text-xl">
          BuildTags admins <span className="text-muted-foreground">{admins.length}</span>
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Admins can see and change every account, business and order. Use Make admin on a member below to add one. You can&apos;t remove yourself, and
          there is always at least one admin.
        </p>
        <ul className="mt-3 divide-y divide-line">
          {admins.map((a) => (
            <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium">{a.display_name || a.username || a.email}</span>
                {a.username && <span className="text-muted-foreground"> @{a.username}</span>}
                <span className="block text-xs text-muted-foreground">
                  {a.email}
                  {a.granted_by ? ` · added by @${a.granted_by}` : ""} · {fmt(a.created_at)}
                </span>
              </span>
              <AdminRoleToggle userId={a.user_id} username={a.username ?? a.email} isAdmin isMe={a.user_id === user.id} />
            </li>
          ))}
        </ul>
      </section>

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
              <th>Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.id} className="[&>td]:px-3 [&>td]:py-2 [&>td]:align-middle">
                <td>
                  <span className="block font-medium">{m.display_name || m.username}</span>
                  <span className="block text-xs text-muted-foreground">@{m.username}{adminIds.has(m.id) && <span className="ml-1.5 text-signal">· Admin</span>}</span>
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
                <td>
                  <AdminRoleToggle userId={m.id} username={m.username} isAdmin={adminIds.has(m.id)} isMe={m.id === user.id} />
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">
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

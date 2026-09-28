import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/server";
import type { QrCodeRow, VehicleRow } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";
import { AdminVehicleActions } from "@/components/admin/vehicle-actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

interface UserHit {
  id: string;
  username: string;
  display_name: string;
  email: string;
  created_at: string;
  vehicle_count: number;
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").slice(0, 80);
  const { client } = await requireAdmin();

  const [usersRes, vehiclesRes, openReports, pendingBusinesses] = await Promise.all([
    client.rpc("admin_search_users", { p_query: q, p_limit: 25 }),
    q
      ? client
          .from("vehicles")
          .select("*, qr_codes(id, code, status)")
          .or(`slug.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%,nickname.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(25)
      : client.from("vehicles").select("*, qr_codes(id, code, status)").order("created_at", { ascending: false }).limit(25),
    client.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    client.from("organizations").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const users = (usersRes.data ?? []) as UserHit[];
  const vehicles = (vehiclesRes.data ?? []) as (VehicleRow & { qr_codes: Pick<QrCodeRow, "id" | "code" | "status">[] })[];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Moderation</p>
          <h1 className="mt-2 text-4xl">Search</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/organizations" className={pendingBusinesses.count ? "btn-signal btn-small" : "btn-ghost btn-small"}>
            Business applications: {pendingBusinesses.count ?? 0}
          </Link>
          <Link href="/admin/reports" className="btn-ghost btn-small">
            Open reports: {openReports.count ?? 0}
          </Link>
        </div>
      </div>

      <form action="/admin" method="get" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Username, email, slug, make, model…" className="field" aria-label="Search" />
        <button type="submit" className="btn-signal">
          Search
        </button>
      </form>

      <section>
        <h2 className="text-2xl">Users</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left">
              <tr>
                <th className="label-tech px-4 py-2">Username</th>
                <th className="label-tech px-4 py-2">Name</th>
                <th className="label-tech px-4 py-2">Email</th>
                <th className="label-tech px-4 py-2">Vehicles</th>
                <th className="label-tech px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-mono">@{u.username}</td>
                  <td className="px-4 py-2">{u.display_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2 tabular-nums">{u.vehicle_count}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No users match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl">Vehicles</h2>
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {vehicles.map((v) => (
            <li key={v.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {vehicleTitle(v)} {v.nickname && <span className="text-muted-foreground">“{v.nickname}”</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  <Link href={`/build/${v.slug}`} className="underline" target="_blank" rel="noopener">
                    /build/{v.slug}
                  </Link>{" "}
                  · {v.visibility} · {v.status} · QR {v.qr_codes[0]?.code ?? "none"} ({v.qr_codes[0]?.status ?? "n/a"})
                </p>
              </div>
              <AdminVehicleActions vehicleId={v.id} status={v.status} qr={v.qr_codes[0] ?? null} />
            </li>
          ))}
          {vehicles.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No vehicles match.</li>}
        </ul>
      </section>
    </div>
  );
}

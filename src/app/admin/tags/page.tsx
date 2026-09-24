import type { Metadata } from "next";
import Link from "next/link";
import { QrCode } from "lucide-react";

import { requireAdmin } from "@/lib/supabase/server";
import type { VehicleRow } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";

export const metadata: Metadata = { title: "Free tags", robots: { index: false } };

interface UserHit {
  id: string;
  username: string;
  display_name: string;
  email: string;
  created_at: string;
  vehicle_count: number;
}

export default async function AdminTagsPage({ searchParams }: PageProps<"/admin/tags">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").slice(0, 80);
  const { client } = await requireAdmin();
  const { data: usersData } = await client.rpc("admin_search_users", { p_query: q, p_limit: 20 });
  const users = (usersData ?? []) as UserHit[];
  const ids = users.map((u) => u.id);
  const { data: vehiclesData } = ids.length ? await client.from("vehicles").select("*").in("owner_id", ids).order("created_at", { ascending: false }) : { data: [] as VehicleRow[] };
  const vehicles = (vehiclesData ?? []) as VehicleRow[];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Free tags</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pick a member and one of their cars, design the decal with their permanent QR, then approve it as a free order. It lands in the fulfillment queue as paid, and the member sees it under their orders.
          </p>
        </div>
        <form action="/admin/tags" method="get" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="username, name or email" className="field h-10 w-64" aria-label="Search members" />
          <button type="submit" className="btn-ghost h-10">
            Search
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-4">
        {users.map((u) => {
          const cars = vehicles.filter((v) => v.owner_id === u.id);
          return (
            <section key={u.id} className="panel p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-xl font-bold uppercase">{u.display_name || u.username}</p>
                <p className="text-sm text-muted-foreground">
                  @{u.username} · {u.email}
                </p>
              </div>
              {cars.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No vehicles yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                  {cars.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="block size-12 shrink-0 overflow-hidden rounded bg-surface-2">
                        {v.hero_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.hero_image_url} alt="" className="size-full object-cover" loading="lazy" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {v.nickname ? `${v.nickname} · ` : ""}
                          {vehicleTitle(v)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {v.visibility} · {v.status} · /build/{v.slug}
                        </span>
                      </span>
                      <Link href={`/admin/tags/${v.id}`} className="btn-signal btn-small shrink-0">
                        <QrCode className="size-4" aria-hidden="true" />
                        Design free tag
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {users.length === 0 && <p className="text-sm text-muted-foreground">No members match. Search by username, name or email.</p>}
      </div>
    </div>
  );
}

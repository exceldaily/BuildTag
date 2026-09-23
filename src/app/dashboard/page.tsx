import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { listGarage } from "@/lib/db/vehicles";
import { PLAN_LIMITS, getUserPlan } from "@/lib/db/plan";
import { requireProfile } from "@/lib/supabase/server";
import type { DashboardStats } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { StatTile } from "@/components/dashboard/stat-tile";
import { VehicleCard } from "@/components/dashboard/vehicle-card";

export const metadata: Metadata = { title: "Garage", robots: { index: false } };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const { client, user, profile } = await requireProfile("/dashboard");
  const [vehicles, statsRes, plan] = await Promise.all([listGarage(client), client.rpc("dashboard_stats"), getUserPlan(client, user.id)]);
  const stats = (statsRes.data ?? { vehicles: 0, scans: 0, likes: 0, clicks: 0 }) as unknown as DashboardStats;
  const limit = PLAN_LIMITS[plan].vehicles;
  const canAdd = vehicles.length < limit;

  return (
    <div>
      {sp.error === "forbidden" && (
        <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          You do not have access to that area.
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{plan === "pro" ? "Pro" : "Free plan"}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Welcome back, {profile.display_name.split(" ")[0] || profile.username}</h1>
        </div>
        {canAdd ? (
          <Link href="/dashboard/vehicles/new" className="btn-signal">
            <Plus className="size-4" aria-hidden="true" />
            Add vehicle
          </Link>
        ) : (
          <span className="btn-ghost cursor-not-allowed opacity-70" title={`Your plan allows ${limit} vehicle${limit === 1 ? "" : "s"}`}>
            {limit} of {limit} vehicles
          </span>
        )}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <StatTile label="Vehicles" value={formatCount(stats.vehicles)} />
        <StatTile label="Total scans" value={formatCount(stats.scans)} />
        <StatTile label="Total likes" value={formatCount(stats.likes)} />
        <StatTile label="Product clicks" value={formatCount(stats.clicks)} />
      </dl>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">My garage</h2>
          <span className="label-tech">
            {vehicles.length} / {limit}
          </span>
        </div>

        {vehicles.length === 0 ? (
          <div className="panel mt-4 flex flex-col items-center px-6 py-16 text-center">
            <p className="text-2xl font-display uppercase">Your garage is empty</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Add your first vehicle. You get a permanent BuildTag the moment it exists.
            </p>
            <Link href="/dashboard/vehicles/new" className="btn-signal mt-6">
              <Plus className="size-4" aria-hidden="true" />
              Add vehicle
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

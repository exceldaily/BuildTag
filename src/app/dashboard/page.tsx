import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { listMyOrganizations } from "@/lib/db/business";
import { listGarage } from "@/lib/db/vehicles";
import { PLAN_LIMITS, getUserPlan } from "@/lib/db/plan";
import { requireProfile } from "@/lib/supabase/server";
import type { DashboardStats } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { StatTile } from "@/components/dashboard/stat-tile";
import { VehicleCard } from "@/components/dashboard/vehicle-card";
import { InstallAppPrompt } from "@/components/layout/install-app";
import { t } from "@/lib/i18n/dictionary";

export const metadata: Metadata = { title: "Garage", robots: { index: false } };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const { client, user, profile } = await requireProfile("/dashboard");
  const [vehicles, statsRes, plan, orgs] = await Promise.all([
    listGarage(client, user.id),
    client.rpc("dashboard_stats"),
    getUserPlan(client, user.id),
    listMyOrganizations(client),
  ]);
  const stats = (statsRes.data ?? { vehicles: 0, scans: 0, likes: 0, clicks: 0 }) as unknown as DashboardStats;
  const limit = PLAN_LIMITS[plan].vehicles;
  const canAdd = vehicles.length < limit;
  const L = profile.locale;

  return (
    <div>
      {sp.error === "forbidden" && (
        <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          You do not have access to that area.
        </p>
      )}
      <InstallAppPrompt welcome={sp.welcome === "1"} className="mb-8" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{plan === "pro" ? t(L, "garage_pro_plan") : t(L, "garage_free_plan")}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl xl:text-6xl">{t(L, "garage_welcome", { name: profile.display_name.split(" ")[0] || profile.username })}</h1>
        </div>
        {canAdd ? (
          <Link href="/dashboard/vehicles/new" className="btn-signal">
            <Plus className="size-4" aria-hidden="true" />
            {t(L, "garage_add_vehicle")}
          </Link>
        ) : (
          <span className="btn-ghost cursor-not-allowed opacity-70" title={`Your plan allows ${limit} vehicle${limit === 1 ? "" : "s"}`}>
            {limit} of {limit} vehicles
          </span>
        )}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <StatTile label={t(L, "garage_vehicles")} value={formatCount(stats.vehicles)} />
        <StatTile label={t(L, "garage_total_scans")} value={formatCount(stats.scans)} />
        <StatTile label={t(L, "garage_total_likes")} value={formatCount(stats.likes)} />
        <StatTile label={t(L, "garage_product_clicks")} value={formatCount(stats.clicks)} />
      </dl>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">{t(L, "garage_my_garage")}</h2>
          <span className="label-tech">
            {vehicles.length} / {limit}
          </span>
        </div>

        {vehicles.length === 0 ? (
          <div className="panel mt-4 flex flex-col items-center px-6 py-16 text-center">
            <p className="text-2xl font-display uppercase">{t(L, "garage_empty_title")}</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t(L, "garage_empty_body")}</p>
            <Link href="/dashboard/vehicles/new" className="btn-signal mt-6">
              <Plus className="size-4" aria-hidden="true" />
              {t(L, "garage_add_vehicle")}
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </section>

      {orgs.length === 0 && (
        <section className="mt-12 flex flex-col gap-4 rounded-lg border border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">BuildTags Business</p>
            <p className="mt-1 font-display text-xl font-bold uppercase">Run a shop, dealership or install business?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create build pages for customer vehicles, hand them off with a claim link, and keep credit for the parts you install.
            </p>
          </div>
          <Link href="/dashboard/business/register" className="btn-signal btn-small shrink-0">
            Register your business
          </Link>
        </section>
      )}
    </div>
  );
}

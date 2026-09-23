import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/server";
import type { ReportRow, VehicleRow } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";
import { ReportActions } from "@/components/admin/report-actions";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

type ReportWithVehicle = ReportRow & { vehicles: Pick<VehicleRow, "id" | "slug" | "year" | "make" | "model" | "nickname" | "status"> | null };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && ["open", "reviewing", "resolved", "dismissed"].includes(sp.status) ? sp.status : "open";
  const { client } = await requireAdmin();
  const { data } = await client
    .from("reports")
    .select("*, vehicles(id, slug, year, make, model, nickname, status)")
    .eq("status", status as ReportRow["status"])
    .order("created_at", { ascending: false })
    .limit(100);
  const reports = (data ?? []) as unknown as ReportWithVehicle[];

  return (
    <div>
      <p className="eyebrow">Moderation</p>
      <h1 className="mt-2 text-4xl">Reports</h1>
      <div className="mt-6 flex gap-2">
        {["open", "reviewing", "resolved", "dismissed"].map((s) => (
          <Link key={s} href={`/admin/reports?status=${s}`} className={`btn-ghost btn-small ${s === status ? "border-signal text-foreground" : ""}`}>
            {s}
          </Link>
        ))}
      </div>
      <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
        {reports.map((r) => (
          <li key={r.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold tracking-wider text-signal uppercase">{r.reason}</p>
              <p className="mt-1 text-sm">
                {r.vehicles ? (
                  <Link href={`/build/${r.vehicles.slug}`} className="underline" target="_blank" rel="noopener">
                    {vehicleTitle(r.vehicles)} {r.vehicles.nickname ? `“${r.vehicles.nickname}”` : ""}
                  </Link>
                ) : (
                  "Vehicle removed"
                )}
                {r.vehicles?.status === "disabled" && <span className="ml-2 text-xs text-destructive">disabled</span>}
              </p>
              {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}
              {r.admin_note && <p className="mt-2 text-xs text-muted-foreground">Note: {r.admin_note}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <ReportActions reportId={r.id} status={r.status} vehicleId={r.vehicles?.id ?? null} vehicleStatus={r.vehicles?.status ?? null} />
          </li>
        ))}
        {reports.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">No {status} reports.</li>}
      </ul>
    </div>
  );
}

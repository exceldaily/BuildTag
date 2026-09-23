import Link from "next/link";
import { BadgeDollarSign } from "lucide-react";

import { SOCIAL_PLATFORM_LABEL, type VehicleAnalytics } from "@/lib/types";
import { formatCount } from "@/lib/utils";

import { StatTile } from "./stat-tile";

/** "Sep 23" from an ISO date string (server-rendered, so no hydration drift). */
function fmtDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Server-rendered analytics: simple, understandable, no chart library. */
export function AnalyticsView({ data, vehicleId }: { data: VehicleAnalytics; vehicleId: string }) {
  const series = data.scans_by_day ?? [];
  const max = Math.max(1, ...series.map((d) => d.count));
  const devices = Object.entries(data.devices ?? {}).sort((a, b) => b[1] - a[1]);
  const deviceTotal = devices.reduce((s, [, n]) => s + n, 0);

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <StatTile label="Total scans" value={formatCount(data.total_scans)} />
        <StatTile label="Today" value={formatCount(data.scans_today)} />
        <StatTile label="7 days" value={formatCount(data.scans_7d)} />
        <StatTile label="30 days" value={formatCount(data.scans_30d)} />
        <StatTile label="Likes" value={formatCount(data.likes)} />
        <StatTile label="Product clicks" value={formatCount(data.product_clicks)} />
        <StatTile label="Social clicks" value={formatCount(data.social_clicks)} />
        <StatTile label="Click rate" value={data.total_scans ? `${Math.round(((data.product_clicks + data.social_clicks) / data.total_scans) * 100)}%` : "—"} hint="Clicks per scan" />
      </dl>

      <section className="rounded-lg border border-signal/40 bg-[linear-gradient(120deg,rgba(255,45,122,0.14),rgba(31,216,255,0.06)_60%,transparent)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-signal">Affiliate earnings</p>
            <h2 className="mt-1 text-2xl">
              {formatCount(data.affiliate_clicks ?? 0)} affiliate click{(data.affiliate_clicks ?? 0) === 1 ? "" : "s"} sent to your programs
            </h2>
            <p className="mt-1 text-sm text-foreground/80">
              {data.affiliate_clicks_30d ?? 0} in the last 30 days · {data.monetized_parts ?? 0} of {data.total_parts ?? 0} parts carry your affiliate link
              {(data.linked_parts ?? 0) > (data.monetized_parts ?? 0) && ` · ${(data.linked_parts ?? 0) - (data.monetized_parts ?? 0)} linked parts are not earning yet`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Commissions are paid by the programs themselves. Check their dashboards for what each click turned into.</p>
          </div>
          <Link href={`/dashboard/vehicles/${vehicleId}/modifications`} className="btn-signal btn-small shrink-0">
            <BadgeDollarSign className="size-4" aria-hidden="true" />
            {(data.monetized_parts ?? 0) === 0 ? "Add affiliate links" : "Manage links"}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl">Scans over time</h2>
        <p className="text-xs text-muted-foreground">Last 30 days</p>
        <div className="panel mt-3 p-4">
          <svg viewBox={`0 0 ${series.length * 12} 100`} className="h-40 w-full" role="img" aria-label="Daily scans for the last 30 days" preserveAspectRatio="none">
            {series.map((d, i) => {
              const h = (d.count / max) * 90;
              return (
                <rect key={d.day} x={i * 12 + 2} y={100 - h} width={8} height={h} rx={1} fill={d.count ? "#ff2d7a" : "#2b2b31"}>
                  <title>{`${fmtDay(d.day)}: ${d.count} scans`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{series[0] ? fmtDay(series[0].day) : ""}</span>
            <span>Peak {max} / day</span>
            <span>{series.length ? fmtDay(series[series.length - 1].day) : ""}</span>
          </div>
          <ul className="sr-only">
            {series.map((d) => (
              <li key={d.day}>
                {fmtDay(d.day)}: {d.count} scans
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-2xl">Most clicked parts</h2>
          {data.top_parts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No part clicks yet. Add affiliate links to your modifications so every click can pay you.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line rounded-lg border border-line">
              {data.top_parts.map((p, i) => (
                <li key={`${p.brand}-${p.part_name}-${i}`} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {p.brand && <span className="text-foreground/70">{p.brand} </span>}
                      {p.part_name}
                    </span>
                    {p.is_affiliate && <span className="shrink-0 rounded-full border border-signal/50 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-signal uppercase">Earning</span>}
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums">{formatCount(p.count)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <h2 className="text-2xl">Top social links</h2>
          {data.top_socials.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No social clicks yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line rounded-lg border border-line">
              {data.top_socials.map((s, i) => (
                <li key={`${s.platform}-${s.handle}-${i}`} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="truncate">
                    {SOCIAL_PLATFORM_LABEL[s.platform]} @{s.handle}
                    <span className="ml-2 text-xs text-muted-foreground">{s.owner_type}</span>
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums">{formatCount(s.count)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-2xl">Devices</h2>
          {deviceTotal === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No scans yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {devices.map(([name, n]) => (
                <li key={name}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{name}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round((n / deviceTotal) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-surface-2">
                    <div className="h-full bg-foreground/80" style={{ width: `${(n / deviceTotal) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="text-2xl">Countries</h2>
          {data.countries.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No scans yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {data.countries.map((c) => (
                <li key={c.country} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>{c.country === "??" ? "Unknown" : c.country}</span>
                  <span className="tabular-nums">{formatCount(c.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

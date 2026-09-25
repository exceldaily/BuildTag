import Link from "next/link";

import { MOD_CATEGORY_LABEL, type OrgAnalytics } from "@/lib/types";
import { formatCount, vehicleTitle } from "@/lib/utils";
import { StatTile } from "@/components/dashboard/stat-tile";

export const ANALYTICS_WINDOWS = [7, 30, 90, 365] as const;

/** "Sep 23" from an ISO date string (server-rendered, so no hydration drift). */
function fmtDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function windowLabel(days: number) {
  return days === 365 ? "Last 12 months" : `Last ${days} days`;
}

/**
 * Business analytics: scans on the builds a business is attached to and
 * clicks on the parts it recorded or installed. Aggregate counts only.
 * `hrefFor` builds the link for each time-window button.
 */
export function BusinessAnalyticsView({ data, hrefFor }: { data: OrgAnalytics; hrefFor: (days: number) => string }) {
  const series = data.scans_by_day ?? [];
  const max = Math.max(1, ...series.map((d) => d.count));
  const barW = series.length > 120 ? 3 : 12;
  const devices = Object.entries(data.devices ?? {}).sort((a, b) => b[1] - a[1]);
  const deviceTotal = devices.reduce((s, [, n]) => s + n, 0);
  const maxPartClicks = Math.max(1, ...data.top_parts.map((p) => p.clicks));

  return (
    <div className="space-y-10">
      <nav className="flex flex-wrap gap-1" aria-label="Time window">
        {ANALYTICS_WINDOWS.map((d) => (
          <Link
            key={d}
            href={hrefFor(d)}
            aria-current={d === data.days ? "page" : undefined}
            className={d === data.days ? "btn-signal btn-small" : "btn-ghost btn-small"}
          >
            {d === 365 ? "12 mo" : `${d} days`}
          </Link>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <StatTile label={`Scans · ${windowLabel(data.days).toLowerCase()}`} value={formatCount(data.scans)} hint={`${formatCount(data.scans_all_time)} all time`} />
        <StatTile label="Scans today" value={formatCount(data.scans_today)} hint={`${formatCount(data.scans_7d)} in 7 days`} />
        <StatTile label="Builds scanned" value={`${formatCount(data.vehicles_scanned)} / ${formatCount(data.vehicles)}`} hint="Builds with at least one scan" />
        <StatTile label="Parts you installed" value={formatCount(data.parts)} hint={`${formatCount(data.parts_linked)} with a product link`} />
        <StatTile label="Part clicks" value={formatCount(data.part_clicks)} hint={`${formatCount(data.part_clicks_all_time)} all time`} />
        <StatTile label="Clicks per scan" value={data.scans ? `${Math.round((data.part_clicks / data.scans) * 100)}%` : "—"} hint="Part clicks ÷ scans" />
      </dl>

      <section>
        <h2 className="text-2xl">Scans on your builds</h2>
        <p className="text-xs text-muted-foreground">{windowLabel(data.days)}</p>
        <div className="panel mt-3 p-4">
          <svg viewBox={`0 0 ${Math.max(1, series.length) * barW} 100`} className="h-40 w-full" role="img" aria-label={`Daily scans, ${windowLabel(data.days).toLowerCase()}`} preserveAspectRatio="none">
            {series.map((d, i) => {
              const h = (d.count / max) * 90;
              return (
                <rect key={d.day} x={i * barW + barW * 0.15} y={100 - h} width={barW * 0.7} height={h} rx={barW > 4 ? 1 : 0} fill={d.count ? "#ff2d7a" : "#2b2b31"}>
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
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl">Your parts, by clicks</h2>
          <p className="text-xs text-muted-foreground">Parts your business recorded or is credited with installing, grouped by brand and part name.</p>
          {data.top_parts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No parts recorded yet. Parts you add to customer builds show up here with their clicks.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line rounded-lg border border-line">
              {data.top_parts.map((p, i) => (
                <li key={`${p.brand}-${p.part_name}-${i}`} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {p.brand && <span className="text-foreground/70">{p.brand} </span>}
                      {p.part_name}
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums">{formatCount(p.clicks)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {MOD_CATEGORY_LABEL[p.category] ?? p.category} · on {p.vehicles} build{p.vehicles === 1 ? "" : "s"}
                    </span>
                    <span>clicks</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded bg-surface-2">
                    <div className="h-full bg-signal" style={{ width: `${(p.clicks / maxPartClicks) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="text-2xl">Most scanned builds</h2>
          <p className="text-xs text-muted-foreground">{windowLabel(data.days)}</p>
          {data.top_vehicles.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No scans or part clicks in this window yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line rounded-lg border border-line">
              {data.top_vehicles.map((v) => (
                <li key={v.vehicle_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate">
                    {v.is_public ? (
                      <Link href={`/build/${v.slug}`} className="hover:underline" target="_blank">
                        {v.nickname || vehicleTitle(v)}
                      </Link>
                    ) : (
                      <span>{v.nickname || vehicleTitle(v)}</span>
                    )}
                    {!v.is_public && <span className="ml-2 text-xs text-muted-foreground">private</span>}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="font-display text-lg font-bold">{formatCount(v.scans)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">scans · {formatCount(v.part_clicks)} clicks</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <h2 className="text-2xl">Categories</h2>
          {data.categories.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No parts yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {data.categories.map((c) => (
                <li key={c.category} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>{MOD_CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCount(c.installs)} parts · <span className="text-foreground">{formatCount(c.clicks)} clicks</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
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

      <p className="text-xs text-muted-foreground">
        Counts only: BuildTags never shows who scanned. Builds count while your business is linked to them (creator, builder, dealer, installer) or has
        parts recorded on them. Parts an owner hides are left out.
      </p>
    </div>
  );
}

/** Parses ?days= into one of the supported windows (default 30). */
export function parseAnalyticsDays(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (ANALYTICS_WINDOWS as readonly number[]).includes(n) ? n : 30;
}

import Link from "next/link";

import type { GarageVehicle } from "@/lib/db/vehicles";
import { formatCount, powerLabel, vehicleTitle } from "@/lib/utils";

export function VehicleCard({ vehicle: v }: { vehicle: GarageVehicle }) {
  const title = vehicleTitle(v);
  const power = powerLabel(v.horsepower, v.horsepower_type);
  const qr = v.qr_codes[0];
  const base = `/dashboard/vehicles/${v.id}`;

  return (
    <article className="panel overflow-hidden">
      <div className="relative aspect-[16/9] bg-surface-2">
        {v.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.hero_image_url} alt={title} className="size-full object-cover" loading="lazy" />
        ) : (
          <Link href={`${base}/photos`} className="flex size-full items-center justify-center label-tech hover:text-foreground">
            Add a hero photo
          </Link>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {v.visibility !== "public" && <span className="rounded bg-background/85 px-2 py-1 font-display text-xs font-bold tracking-wider uppercase">{v.visibility}</span>}
          {v.status === "disabled" && <span className="rounded bg-destructive px-2 py-1 font-display text-xs font-bold tracking-wider text-white uppercase">Disabled</span>}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <p className="label-tech">{title}</p>
        <h3 className="mt-1 text-3xl leading-none">{v.nickname || v.model}</h3>
        <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            [power ? formatCount(v.horsepower) : "—", power ? v.horsepower_type : "Power"],
            [formatCount(v.mod_count), "Mods"],
            [formatCount(v.scan_count), "Scans"],
            [formatCount(v.like_count), "Likes"],
          ].map(([val, label]) => (
            <div key={label} className="rounded-md bg-surface-2 py-2">
              <dd className="font-display text-xl font-bold tabular-nums">{val}</dd>
              <dt className="label-tech text-[10px]">{label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href={`/build/${v.slug}`} className="btn-ghost btn-small">
            View build
          </Link>
          <Link href={base} className="btn-ghost btn-small">
            Edit build
          </Link>
          <Link href={`${base}/buildtag`} className="btn-ghost btn-small">
            BuildTag
          </Link>
          <Link href={`${base}/analytics`} className="btn-ghost btn-small">
            Analytics
          </Link>
        </div>
        {qr && (
          <p className="mt-3 text-xs text-muted-foreground">
            Permanent code <span className="font-mono text-foreground">{qr.code}</span>
            {qr.status === "disabled" ? " (disabled)" : ""}
          </p>
        )}
      </div>
    </article>
  );
}

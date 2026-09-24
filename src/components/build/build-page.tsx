import Link from "next/link";

import { photoUrl } from "@/lib/storage";
import type { PublicBuild } from "@/lib/types";
import { formatCount, formatMoney, powerLabel, torqueLabel, vehicleTitle } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/layout/logo";

import { ContributorsSection } from "./contributors-section";
import { Gallery } from "./gallery";
import { LikeButton } from "./like-button";
import { ModificationsList } from "./modifications-list";
import { OwnerSection } from "./owner-section";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n";
import { ReportDialog } from "./report-dialog";
import { ShareButton } from "./share-button";
import { SocialButtons } from "./social-buttons";

/**
 * The scanned build page. Server-rendered, image-first, minimal JS: only
 * like, share, report and gallery are client components.
 */
export function BuildPage({ build: b, liked, viaTag, ownerPro = false, crew = null, locale = "en" }: { build: PublicBuild; liked: boolean; viaTag: boolean; ownerPro?: boolean; crew?: { name: string; slug: string } | null; locale?: Locale }) {
  const L = locale;
  const title = vehicleTitle(b);
  const power = powerLabel(b.horsepower, b.horsepower_type);
  const torque = torqueLabel(b.torque, b.torque_unit, b.horsepower_type);
  const hero = b.hero_image_url ?? (b.photos[0] ? photoUrl(b.photos[0].storage_path, "full") : null);
  const ownerSocials = b.owner?.socials ?? [];
  const builtBy = b.contributors.find((c) => c.organization && c.roles.some((r) => r === "creator" || r === "builder" || r === "dealer"))?.organization ?? null;
  // personal crew of the owner first, then the shop / dealership communities the build belongs to
  const crewChips = [...(crew ? [crew] : []), ...b.crews].filter((c, i, all) => all.findIndex((x) => x.slug === c.slug) === i);
  const vehiclePlatforms = new Set(b.vehicle_socials.map((s) => s.platform));
  const extraOwnerSocials = ownerSocials.filter((s) => !vehiclePlatforms.has(s.platform));

  return (
    <main className="min-h-dvh bg-background">
      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10 2xl:px-14">
        <Link href="/" className="inline-flex" aria-label="BuildTag home">
          <Wordmark className="h-8 sm:h-9" />
        </Link>
        <ShareButton slug={b.slug} title={`${power ? `${power} ` : ""}${title}`} compact />
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-2 sm:aspect-[16/9] md:aspect-[21/9]">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={`${title}${b.nickname ? ` "${b.nickname}"` : ""}`} fetchPriority="high" decoding="async" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="label-tech">{t(L, "build_no_photos")}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
        </div>

        <div className="relative mx-auto -mt-32 max-w-[1500px] px-4 sm:-mt-40 sm:px-6 lg:px-10 2xl:px-14">
          <div className="animate-rise">
            <p className="eyebrow">{viaTag ? "Scanned from a BuildTag" : t(L, "build_sheet")}</p>
            <p className="mt-2 font-display text-xl font-semibold tracking-[0.08em] text-foreground/80 uppercase sm:text-2xl">
              {title}
              {b.trim ? <span className="text-muted-foreground"> {b.trim}</span> : null}
            </p>
            {b.nickname && <h1 className="mt-1 text-6xl leading-[0.9] sm:text-8xl">{b.nickname}</h1>}
            {!b.nickname && <h1 className="sr-only">{title}</h1>}
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <Stat value={b.horsepower ? formatCount(b.horsepower) : "—"} label={b.horsepower ? b.horsepower_type : "Power"} />
            <Stat value={b.torque ? formatCount(b.torque) : "—"} label={torque ? torque.split(" ").slice(1).join(" ") : "Torque"} />
            <Stat value={formatCount(b.mod_count)} label="Mods" />
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {b.owner && (
              <Link href={`/build/${b.slug}#owner`} className="label-tech hover:text-foreground">
                {t(L, "build_owner")} @{b.owner.username}
              </Link>
            )}
            {builtBy && (
              <Link href={`/org/${builtBy.slug}`} className="label-tech hover:text-foreground">
                {b.owner ? "· " : ""}
                {t(L, "build_built_by")} {builtBy.name}
              </Link>
            )}
            {b.location_text && <span className="label-tech">· {b.location_text}</span>}
            {crewChips.map((c) => (
              <Link
                key={c.slug}
                href={`/crew/${c.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-neon-cyan/50 bg-neon-cyan/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-neon-cyan uppercase hover:bg-neon-cyan/20"
              >
                {t(L, "build_crew")} · {c.name}
              </Link>
            ))}
          </div>

          {b.vehicle_socials.length > 0 && (
            <div className="mt-4">
              <SocialButtons slug={b.slug} socials={b.vehicle_socials} label="Vehicle socials" />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <LikeButton slug={b.slug} initialCount={b.like_count} initialLiked={liked} />
            <ShareButton slug={b.slug} title={`${power ? `${power} ` : ""}${title}`} />
            <a href="#mods" className="btn-ghost">
              {t(L, "build_see_mods")}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 2xl:px-14">
        {/* ABOUT + SPECS */}
        <section className="mt-14 grid gap-10 md:grid-cols-[1.2fr_0.8fr] xl:grid-cols-[1.35fr_0.65fr] xl:gap-16">
          <div>
            <h2 className="text-2xl">About the build</h2>
            {b.description ? (
              <p className="mt-3 whitespace-pre-line text-base text-foreground/85">{b.description}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">The owner has not written a description yet.</p>
            )}
          </div>
          <div>
            <h2 className="text-2xl">Build specs</h2>
            <dl className="mt-3 divide-y divide-line rounded-lg border border-line">
              <SpecRow label="Power" value={power || "—"} />
              <SpecRow label="Torque" value={torque || "—"} />
              {b.dyno_type && <SpecRow label="Dyno" value={b.dyno_type} />}
              <SpecRow label="Mileage" value={b.mileage ? `${formatCount(b.mileage)} ${b.mileage_unit.toLowerCase()}` : "—"} />
              <SpecRow label="Build started" value={b.build_started_year ? String(b.build_started_year) : "—"} />
              <SpecRow label="Modifications" value={formatCount(b.mod_count)} />
            </dl>
            {b.build_cost_public && b.build_cost !== null && (
              <div className="mt-4 rounded-lg border border-signal/40 bg-signal/10 p-4">
                <p className="label-tech">{t(L, "build_total_build")}</p>
                <p className="stat-number mt-1">{formatMoney(b.build_cost)}</p>
              </div>
            )}
          </div>
        </section>

        {/* GALLERY */}
        {b.photos.length > 1 && (
          <section className="mt-14">
            <h2 className="text-2xl">Gallery</h2>
            <Gallery photos={b.photos} title={title} />
          </section>
        )}

        {/* MODS */}
        <section id="mods" className="mt-14 scroll-mt-20">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl">{t(L, "build_modifications")}</h2>
            <span className="label-tech">{t(L, "build_total", { n: formatCount(b.mod_count) })}</span>
          </div>
          <ModificationsList slug={b.slug} modifications={b.modifications} hasAffiliateLinks={b.has_affiliate_links} locale={L} />
        </section>

        {/* BUILT BY / CONTRIBUTORS */}
        <ContributorsSection contributors={b.contributors} locale={L} />

        {/* OWNER */}
        {b.show_owner_section && b.owner && (
          <section id="owner" className="mt-14 scroll-mt-20">
            <OwnerSection slug={b.slug} owner={b.owner} extraSocials={extraOwnerSocials} pro={ownerPro} />
          </section>
        )}

        {/* FOOTER */}
        <footer className="mt-16 flex flex-col items-center gap-4 border-t border-line py-10 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            <ShareButton slug={b.slug} title={`${power ? `${power} ` : ""}${title}`} />
            <ReportDialog slug={b.slug} />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCount(b.scan_count)} scans · {formatCount(b.like_count)} likes
          </p>
          <Link href="/signup" className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <LogoMark className="size-5" />
            Make your own BuildTag
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-background px-3 py-4 text-center sm:py-5">
      <dd className="stat-number">{value}</dd>
      <dt className="label-tech mt-1">{label}</dt>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="label-tech">{label}</dt>
      <dd className="font-display text-lg font-semibold tabular-nums uppercase">{value}</dd>
    </div>
  );
}

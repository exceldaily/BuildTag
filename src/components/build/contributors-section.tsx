import Link from "next/link";

import { VerifiedBadge } from "@/components/legal/verified-badge";

import { t, type DictKey } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n";
import { ORGANIZATION_TYPE_LABEL, type PublicContributor, type VehicleRelationshipType } from "@/lib/types";

const ROLE_KEY: Record<Exclude<VehicleRelationshipType, "owner">, DictKey> = {
  creator: "role_creator",
  builder: "role_builder",
  dealer: "role_dealer",
  installer: "role_installer",
  tuner: "role_tuner",
  sponsor: "role_sponsor",
};

/**
 * "Built by" / "Build contributors": the businesses attached to this build
 * and the parts they actually recorded. Shown whether or not the build has
 * been claimed; the credit stays with the shop.
 */
export function ContributorsSection({ contributors, locale = "en" }: { contributors: PublicContributor[]; locale?: Locale }) {
  const list = contributors.filter((c) => c.organization);
  if (list.length === 0) return null;
  return (
    <section id="built-by" className="mt-14 scroll-mt-20">
      <h2 className="text-2xl">{t(locale, list.length === 1 ? "build_built_by" : "build_contributors")}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map(({ organization: o, roles, mod_count, crew }) => {
          if (!o) return null;
          const shownRoles = roles.filter((r): r is Exclude<VehicleRelationshipType, "owner"> => r !== "owner" && r !== "creator");
          return (
            <li key={o.slug} className="panel flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                {o.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.logo_url} alt="" className="size-12 shrink-0 rounded-md border border-line bg-surface-2 object-contain" />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 font-display text-xl font-bold uppercase" aria-hidden="true">
                    {o.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-display text-lg font-bold tracking-wide uppercase">
                    {o.name}
                    {o.verified && <VerifiedBadge id={o.slug} label={t(locale, "build_verified_business")} explainer={t(locale, "build_verified_explainer")} />}
                  </p>
                  <p className="label-tech truncate">
                    {[ORGANIZATION_TYPE_LABEL[o.organization_type], o.location_text || null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              {(shownRoles.length > 0 || mod_count > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {shownRoles.map((r) => (
                    <span key={r} className="rounded-full border border-line px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] uppercase">
                      {t(locale, ROLE_KEY[r])}
                    </span>
                  ))}
                  {mod_count > 0 && (
                    <a href="#mods" className="rounded-full border border-signal/50 bg-signal/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-signal uppercase hover:bg-signal/20">
                      {t(locale, "build_parts_recorded", { n: mod_count })}
                    </a>
                  )}
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/org/${o.slug}`} className="btn-ghost btn-small">
                  {t(locale, "build_view_business")}
                </Link>
                {crew && (
                  <Link href={`/crew/${crew.slug}`} className="btn-ghost btn-small">
                    {crew.name}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t(locale, "build_disclosure_attribution")}</p>
    </section>
  );
}

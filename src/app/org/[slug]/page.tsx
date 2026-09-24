import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VerifiedBadge } from "@/components/legal/verified-badge";
import { DISCLOSURE } from "@/lib/legal/consent";
import { Globe, Mail, MapPin, Phone, ScanLine, Users, Wrench } from "lucide-react";

import { getPublicOrganization } from "@/lib/db/public";
import { ORGANIZATION_TYPE_LABEL, RELATIONSHIP_LABEL } from "@/lib/types";
import { formatCount, powerLabel, vehicleTitle } from "@/lib/utils";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/org/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const org = await getPublicOrganization(slug);
  if (!org) return { title: "Business not found", robots: { index: false } };
  const description = org.tagline || `${ORGANIZATION_TYPE_LABEL[org.organization_type]}${org.location_text ? ` in ${org.location_text}` : ""}. ${org.builds.length} builds on BuildTag.`;
  return {
    title: org.name,
    description,
    openGraph: { title: `${org.name} · BuildTag`, description, images: org.logo_url ? [org.logo_url] : org.builds[0]?.hero_image_url ? [org.builds[0].hero_image_url] : undefined },
  };
}

export default async function OrganizationPage({ params }: PageProps<"/org/[slug]">) {
  const { slug } = await params;
  const org = await getPublicOrganization(slug);
  if (!org) notFound();
  const totalScans = org.builds.reduce((sum, b) => sum + b.scan_count, 0);
  const place = org.location_text || [org.city, org.region].filter(Boolean).join(", ");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1720px] px-4 py-10 sm:px-6 md:py-14 lg:px-10 2xl:px-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt="" className="size-20 shrink-0 rounded-lg border border-line bg-surface-2 object-contain sm:size-24" />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 font-display text-4xl font-bold uppercase sm:size-24" aria-hidden="true">
                {org.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="eyebrow">{ORGANIZATION_TYPE_LABEL[org.organization_type]}</p>
              <h1 className="mt-2 flex items-center gap-2 text-4xl sm:text-5xl xl:text-6xl">
                <span className="speed-heading">{org.name}</span>
                {org.verified && <VerifiedBadge id={org.slug} label="Verified business" explainer={DISCLOSURE.verifiedBusiness} className="size-8" />}
              </h1>
              {org.tagline && <p className="mt-2 max-w-xl text-foreground/80">{org.tagline}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {org.website_url && (
              <a href={org.website_url} target="_blank" rel="noopener nofollow" className="btn-ghost btn-small">
                <Globe className="size-4" aria-hidden="true" />
                Website
              </a>
            )}
            {org.phone && (
              <a href={`tel:${org.phone.replace(/[^+\d]/g, "")}`} className="btn-ghost btn-small">
                <Phone className="size-4" aria-hidden="true" />
                Call
              </a>
            )}
            {org.email && (
              <a href={`mailto:${org.email}`} className="btn-ghost btn-small">
                <Mail className="size-4" aria-hidden="true" />
                Email
              </a>
            )}
            {org.socials.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener nofollow" className="btn-ghost btn-small capitalize">
                {s.platform}
              </a>
            ))}
          </div>
        </div>

        {place && (
          <p className="label-tech mt-4 flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" />
            {place}
          </p>
        )}

        <dl className="mt-8 grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <div className="bg-surface px-4 py-4">
            <dt className="label-tech">Builds</dt>
            <dd className="mt-1 font-display text-3xl font-bold tabular-nums">{org.builds.length}</dd>
          </div>
          <div className="bg-surface px-4 py-4">
            <dt className="label-tech">Parts documented</dt>
            <dd className="mt-1 flex items-center gap-2 font-display text-3xl font-bold tabular-nums">
              <Wrench className="size-5 text-signal" aria-hidden="true" />
              {formatCount(org.documented_mods)}
            </dd>
          </div>
          <div className="bg-surface px-4 py-4">
            <dt className="label-tech">Build scans</dt>
            <dd className="mt-1 flex items-center gap-2 font-display text-3xl font-bold tabular-nums">
              <ScanLine className="size-5 text-neon-cyan" aria-hidden="true" />
              {formatCount(totalScans)}
            </dd>
          </div>
        </dl>

        {org.description && <p className="mt-8 max-w-3xl whitespace-pre-line text-foreground/85">{org.description}</p>}

        {org.crew && (
          <Link href={`/crew/${org.crew.slug}`} className="panel mt-8 flex max-w-3xl items-center gap-4 p-4 transition-colors hover:border-foreground/30">
            <Users className="size-6 shrink-0 text-neon-cyan" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-bold tracking-wide uppercase">{org.crew.name}</p>
              <p className="truncate text-sm text-muted-foreground">{org.crew.tagline || `${org.crew.member_count} riders`}</p>
            </div>
            <span className="btn-ghost btn-small shrink-0">View crew</span>
          </Link>
        )}

        <section className="mt-12">
          <h2 className="text-2xl">Builds</h2>
          {org.builds.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No public builds yet.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {org.builds.map((b) => {
                const title = vehicleTitle(b);
                const power = powerLabel(b.horsepower, b.horsepower_type);
                const roles = b.roles.filter((r) => r !== "creator");
                return (
                  <li key={b.slug}>
                    <Link href={`/build/${b.slug}`} className="panel group block overflow-hidden transition-colors hover:border-foreground/30">
                      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                        {b.hero_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.hero_image_url} alt={title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <span className="flex size-full items-center justify-center label-tech">No photo yet</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="truncate font-display text-lg font-bold uppercase">{b.nickname || b.model}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {title}
                          {power ? ` · ${power}` : ""}
                        </p>
                        <p className="label-tech mt-2 truncate">
                          {[roles.length ? roles.map((r) => RELATIONSHIP_LABEL[r]).join(" · ") : null, b.shop_mod_count ? `${b.shop_mod_count} parts by ${org.name}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-12 text-sm text-muted-foreground">
          Run a shop or dealership?{" "}
          <Link href="/business" className="text-foreground underline">
            BuildTags Business
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

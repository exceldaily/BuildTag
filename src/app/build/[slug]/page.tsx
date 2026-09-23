import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getVisitorKey } from "@/lib/analytics/visitor";
import { buildOwnerPlan, getPublicBuild } from "@/lib/db/public";
import { siteUrl } from "@/lib/env";
import { photoUrl } from "@/lib/storage";
import { powerLabel, vehicleTitle } from "@/lib/utils";
import { StatusPage } from "@/components/layout/status-page";
import { BuildPage } from "@/components/build/build-page";

export const dynamic = "force-dynamic";

function normalizeSlug(slug: string): string {
  return slug.toLowerCase().slice(0, 80);
}

export async function generateMetadata({ params }: PageProps<"/build/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  let result;
  try {
    result = await getPublicBuild(normalizeSlug(slug), null);
  } catch {
    return { title: "Build" };
  }
  if (result.access !== "ok") {
    return { title: result.access === "private" ? "Private build" : "Build unavailable", robots: { index: false, follow: false } };
  }
  const b = result.build;
  const title = [powerLabel(b.horsepower, b.horsepower_type), vehicleTitle(b), "Build"].filter(Boolean).join(" ");
  const description = b.description
    ? b.description.slice(0, 160)
    : `${b.nickname ? `"${b.nickname}" ` : ""}${vehicleTitle(b)} with ${b.mod_count} modifications on BuildTag.`;
  const image = b.hero_image_url ?? (b.photos[0] ? photoUrl(b.photos[0].storage_path, "full") : undefined);
  const canonical = `${siteUrl()}/build/${b.slug}`;
  const indexable = b.visibility === "public";

  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "article",
      url: canonical,
      title: `${title} | BuildTag`,
      description,
      images: image ? [{ url: image, alt: vehicleTitle(b) }] : [{ url: "/og.png", width: 1200, height: 630, alt: "BuildTag" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | BuildTag`,
      description,
      images: image ? [image] : ["/og.png"],
    },
  };
}

export default async function BuildRoute({ params, searchParams }: PageProps<"/build/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const visitorKey = await getVisitorKey();
  const [result, ownerPlan] = await Promise.all([getPublicBuild(normalizeSlug(slug), visitorKey), buildOwnerPlan(normalizeSlug(slug))]);

  if (result.access === "not_found") notFound();

  if (result.access === "private") {
    return (
      <StatusPage
        code="PRIVATE"
        title="This build is private"
        description="The owner has set this build to private. If it is yours, sign in to view and edit it."
        actions={[
          { href: "/login", label: "Sign in" },
          { href: "/explore", label: "Explore builds", primary: false },
        ]}
      />
    );
  }

  if (result.access === "disabled") {
    return (
      <StatusPage
        code="UNAVAILABLE"
        title="This build has been disabled"
        description="This build is not available right now."
        actions={[{ href: "/explore", label: "Explore builds" }]}
      />
    );
  }

  const b = result.build;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${vehicleTitle(b)}${b.nickname ? ` "${b.nickname}"` : ""}`,
    brand: { "@type": "Brand", name: b.make },
    model: b.model,
    vehicleModelDate: b.year ?? undefined,
    description: b.description || undefined,
    image: b.hero_image_url ?? undefined,
    url: `${siteUrl()}/build/${b.slug}`,
    ...(b.horsepower
      ? {
          vehicleEngine: {
            "@type": "EngineSpecification",
            enginePower: { "@type": "QuantitativeValue", value: b.horsepower, unitText: b.horsepower_type },
          },
        }
      : {}),
  };

  return (
    <>
      {b.visibility === "public" && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {(result.is_owner || b.status === "disabled" || b.visibility !== "public") && (
        <div className="border-b border-signal/30 bg-signal/10 px-4 py-2 text-center text-xs">
          {result.is_owner ? (
            <>
              You are viewing your own build ({b.visibility}
              {b.status === "disabled" ? ", disabled" : ""}).{" "}
              <Link href="/dashboard" className="underline">
                Back to garage
              </Link>
            </>
          ) : (
            <>This build is {b.visibility}.</>
          )}
        </div>
      )}
      <BuildPage build={b} liked={result.liked} viaTag={sp.via === "tag"} ownerPro={ownerPlan === "pro"} />
    </>
  );
}

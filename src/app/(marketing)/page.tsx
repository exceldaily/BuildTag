import type { Metadata } from "next";

import { siteUrl } from "@/lib/env";
import { decalImage, demoScanUrl, loadLanding } from "@/lib/landing";
import { DESIGNER_TILES, FALLBACK_CODES, HERO_TEMPLATE, REVEAL_TEMPLATE } from "@/lib/landing-config";
import { qrSvg } from "@/lib/qr/generate";
import type { PublicBuild } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";
import { FAQ_ENTRIES, Faq, Pricing } from "@/components/marketing/home-sections";
import { Hero } from "@/components/marketing/hero";
import { Container, SectionHead } from "@/components/marketing/landing-ui";
import {
  Benefits,
  CarsAndBikes,
  Crews,
  DesignerShowcase,
  FinalCta,
  HowItWorks,
  ProductReveal,
  RealBuilds,
  ScanDemo,
  ShopPortfolio,
  Shops,
  Showcase,
  WhatModIsThat,
  type DesignerTile,
} from "@/components/marketing/landing-sections";

const TITLE = "BuildTags | Digital build profiles and QR tags for cars and motorcycles";
const DESCRIPTION =
  "Create a digital build profile for your car or motorcycle: mods, power, photos, socials and parts. Put a permanent BuildTag QR on the vehicle and let anyone scan the build.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "BuildTags",
    title: "BuildTags | Your build deserves a spec sheet.",
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "BuildTags. Your build deserves a spec sheet." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuildTags | Your build deserves a spec sheet.",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const revalidate = 300;

function label(b: PublicBuild): string {
  return b.nickname ? `${b.nickname} · ${b.model}` : vehicleTitle(b);
}

export default async function HomePage() {
  const data = await loadLanding();
  const { car, bagger, sportbike, shopBuild, carCrew, crew, builds } = data;

  const heroDecal = decalImage(car, "car", HERO_TEMPLATE);
  const revealDecal = decalImage(sportbike, "sportbike", REVEAL_TEMPLATE);
  const demoLink = demoScanUrl(car?.qr_code ?? FALLBACK_CODES.car);
  const bikeLink = demoScanUrl(sportbike?.qr_code ?? FALLBACK_CODES.sportbike);

  const tiles: DesignerTile[] = DESIGNER_TILES.flatMap((t) => {
    const b = data[t.build];
    const decal = decalImage(b, t.build, t.template);
    return b && decal ? [{ id: t.template, name: t.name, decal, build: label(b) }] : [];
  });

  const origin = siteUrl().replace(/\/+$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#org`,
        name: "BuildTags",
        url: origin,
        logo: `${origin}/icons/icon-512.png`,
        sameAs: ["https://www.instagram.com/buildtags.app"],
      },
      { "@type": "WebSite", "@id": `${origin}/#site`, url: origin, name: "BuildTags", publisher: { "@id": `${origin}/#org` } },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ENTRIES.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* What it is, in one picture */}
      <Hero car={car} crew={carCrew} decal={heroDecal} />

      {/* Prove it with a real permanent code */}
      <ScanDemo car={car} qr={qrSvg(demoLink, 300)} link={demoLink} />

      <ProductReveal bike={sportbike} decal={revealDecal} link={bikeLink} />
      <HowItWorks />
      <Showcase car={car} crew={carCrew} />
      <Benefits car={car} bagger={bagger} />
      <WhatModIsThat bike={bagger} />
      <DesignerShowcase tiles={tiles} />
      <CarsAndBikes car={car} bike={bagger ?? sportbike} />
      <Crews crew={crew} />
      <Shops build={shopBuild} />
      <ShopPortfolio />
      <RealBuilds builds={builds} />

      <section id="pricing" className="relative scroll-mt-16 border-b border-line bg-[#080712]">
        <Container className="py-16 md:py-24">
          <SectionHead
            eyebrow="Pricing"
            title={<span className="speed-heading">Free is the real thing.</span>}
            lede="Build pages are free. Pro adds more vehicles and crews. BuildTags themselves are priced per order."
          />
          <div className="mt-10">
            <Pricing />
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-10 xl:max-w-4xl">
          <SectionHead eyebrow="Questions" title={<span className="speed-heading">Before you scan.</span>} />
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

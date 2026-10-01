import type { Metadata } from "next";

import { siteUrl } from "@/lib/env";
import { decalImage, demoScanUrl, loadLanding } from "@/lib/landing";
import { DESIGNER_TILES, FALLBACK_CODES, GLASS_TEMPLATE, HERO_TEMPLATE, REVEAL_TEMPLATE } from "@/lib/landing-config";
import { qrSvg } from "@/lib/qr/generate";
import type { PublicBuild } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";
import { FAQ_ENTRIES, Faq, Pricing } from "@/components/marketing/home-sections";
import { Hero } from "@/components/marketing/hero";
import { Container, SectionHead } from "@/components/marketing/landing-ui";
import {
  Benefits,
  BuildLoop,
  CarsAndBikes,
  Crews,
  DesignerShowcase,
  EarnFromBuild,
  FinalCta,
  RealBuilds,
  SameQuestions,
  ScanDemo,
  Shops,
  Showcase,
  ValueStrip,
  type DesignerTile,
} from "@/components/marketing/landing-sections";

const TITLE = "BuildTags | Vehicle build profiles and QR build tags for cars and motorcycles";
const DESCRIPTION =
  "Stop explaining your build. Put your car mod list, specs, photos and socials on one vehicle build profile, then tag the car or motorcycle with a QR build tag anyone can scan.";
const SHARE_TITLE = "BuildTags | Stop explaining your build. Tag it.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "BuildTags",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "BuildTags. Stop explaining your build. Tag it." }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
};

export const revalidate = 300;

function label(b: PublicBuild): string {
  return b.nickname ? `${b.nickname} · ${b.model}` : vehicleTitle(b);
}

export default async function HomePage() {
  const data = await loadLanding();
  const { car, bagger, sportbike, shopBuild, sedan, carCrew, crew, builds } = data;

  const heroDecal = decalImage(car, "car", HERO_TEMPLATE);
  const revealDecal = decalImage(sportbike, "sportbike", REVEAL_TEMPLATE);
  const glassDecal = decalImage(sedan, "sedan", GLASS_TEMPLATE);
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

      {/* The owner's side first: what it solves */}
      <Hero car={car} crew={carCrew} decal={heroDecal} />
      <ValueStrip />
      <SameQuestions build={sedan} decal={glassDecal} />

      {/* Then the scanner's side, with a real permanent code */}
      <ScanDemo car={car} qr={qrSvg(demoLink, 300)} link={demoLink} />

      <Showcase car={car} crew={carCrew} />
      <Benefits car={car} bagger={bagger} />
      <EarnFromBuild build={bagger ?? car} />
      <DesignerShowcase tiles={tiles} />
      <BuildLoop bike={sportbike} decal={revealDecal} link={bikeLink} />
      <CarsAndBikes car={car} bike={bagger ?? sportbike} />
      <Crews crew={crew} />
      <Shops build={shopBuild} />
      <RealBuilds builds={builds} />

      <section id="pricing" className="relative scroll-mt-16 border-b border-line bg-[#080712]">
        <Container className="py-16 md:py-24">
          <SectionHead
            index="13"
            eyebrow="Pricing"
            title={<span className="speed-heading">Free is the real thing.</span>}
            lede="Build pages are free, including part links and your own affiliate links. Pro adds more vehicles and crews. BuildTags themselves are priced per order."
          />
          <div className="mt-10">
            <Pricing />
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-10 xl:max-w-4xl">
          <SectionHead index="14" eyebrow="Questions" title={<span className="speed-heading">Before you scan.</span>} />
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { LEGAL, LEGAL_DOCS } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "What BuildTags does and does not verify about vehicles, parts, performance figures, attribution, QR scanning and ownership.",
  alternates: { canonical: "/disclaimer" },
};

const B = LEGAL.brand;

const S: LegalSection[] = [
  {
    id: "not-certified",
    title: "No inspection or certification",
    content: (
      <>
        <p>
          {B} does not inspect, certify, approve, endorse, or guarantee any vehicle, modification, part, installation, shop, dealer, builder, tuner,
          performance claim, or other information displayed through the platform unless expressly stated otherwise.
        </p>
      </>
    ),
  },
  {
    id: "submitted",
    title: "Who provides the information",
    content: (
      <>
        <p>
          Vehicle information, including horsepower, torque, mileage, modifications, parts, installation history, build cost, photographs, ownership information,
          and other specifications, may be submitted by vehicle owners, shops, dealers, builders, installers, or other third parties.
        </p>
        <p>
          {B} does not independently verify this information unless expressly indicated and does not guarantee that user- or third-party-submitted information
          is complete, current, or accurate.
        </p>
      </>
    ),
  },
  {
    id: "labels",
    title: "Attribution and verification labels",
    content: (
      <>
        <p>
          Labels such as Built By, Installed By, Shop Installed, Dealer Recorded, Owner Added, Verified, or similar descriptions identify the reported source,
          contributor, or defined status of information within the {B} platform.
        </p>
        <p>
          Unless expressly stated otherwise, these labels do not constitute a safety inspection, mechanical certification, manufacturer approval, warranty
          determination, legal-compliance determination, or endorsement by {B}. The Verified business badge means only that {B} confirmed the business&apos;s
          identity and contact details.
        </p>
      </>
    ),
  },
  {
    id: "modifications",
    title: "Modifications and professional advice",
    content: (
      <>
        <p>
          Vehicle modifications can affect safety, reliability, emissions compliance, insurance coverage, manufacturer warranties, and compliance with applicable
          laws.
        </p>
        <p>{B} does not provide automotive, mechanical, engineering, legal, insurance, tax, financial, or regulatory advice.</p>
        <p>
          Vehicle owners are responsible for determining whether modifications and vehicle operation comply with applicable laws and requirements and should
          consult qualified professionals when appropriate.
        </p>
      </>
    ),
  },
  {
    id: "parts",
    title: "Parts and compatibility",
    content: (
      <>
        <p>{B} does not guarantee that any part displayed on a build profile is appropriate, compatible, safe, legal, or suitable for another vehicle.</p>
        <p>A part appearing on another person&apos;s vehicle should not be interpreted as a recommendation that it be installed on yours.</p>
      </>
    ),
  },
  {
    id: "links",
    title: "Product links and affiliate links",
    content: (
      <>
        <p>Product links may lead to third-party websites.</p>
        <p>
          Some links may be affiliate links through which {B} or a participating user may receive compensation from qualifying purchases. Today, only build
          owners earn from affiliate links they add; {B} takes no share.
        </p>
        <p>
          {B} does not control third-party products, sellers, warranties, pricing, availability, shipping, return policies, or services.
        </p>
      </>
    ),
  },
  {
    id: "scanning",
    title: "Physical BuildTags and QR scanning",
    content: (
      <>
        <p>Physical BuildTags and their QR codes are intended to provide convenient access to digital vehicle information.</p>
        <p>
          Scan performance can be affected by placement, installation, damage, dirt, lighting, distance, device capabilities, surface characteristics,
          environmental conditions, internet connectivity, and other factors.
        </p>
        <p>{B} does not guarantee successful scanning under every condition or with every device.</p>
      </>
    ),
  },
  {
    id: "installation",
    title: "Safe installation and use",
    content: (
      <>
        <p>
          Physical BuildTags must not be installed where they interfere with visibility, license plates, required markings, lights, cameras, sensors, airbags,
          safety equipment, or otherwise violate applicable law.
        </p>
        <p>Users are responsible for appropriate installation and use.</p>
        <p>
          <strong>Never scan, configure, or interact with BuildTags while operating a vehicle.</strong>
        </p>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Ownership",
    content: (
      <>
        <p>{B} profiles and ownership designations are not certificates of title or legal proof of vehicle ownership.</p>
        <p>A public BuildTag QR code does not establish ownership.</p>
        <p>Vehicle claiming and transfer features relate to control of the corresponding {B} digital profile.</p>
      </>
    ),
  },
  {
    id: "brands",
    title: "Brands and trademarks",
    content: (
      <>
        <p>
          References to vehicle manufacturers, models, trademarks, product brands, shops, dealers, or other third parties are for identification and
          informational purposes.
        </p>
        <p>
          Unless expressly stated otherwise, {B} is not affiliated with, sponsored by, endorsed by, or approved by any vehicle manufacturer, parts manufacturer,
          dealer, shop, or other third party merely because its name, vehicle, product, or trademark appears on the platform.
        </p>
      </>
    ),
  },
  {
    id: "terms",
    title: "Terms of Service",
    content: (
      <p>
        Use of {B} and reliance on information displayed through the platform is subject to the {B} <Link href="/terms">Terms of Service</Link> and applicable
        law.
      </p>
    ),
  },
];

export default function DisclaimerPage() {
  return (
    <LegalPage
      doc={LEGAL_DOCS.disclaimer}
      intro={<p>{B} is a vehicle-profile, community, product-discovery, and identification platform.</p>}
      sections={S}
    />
  );
}

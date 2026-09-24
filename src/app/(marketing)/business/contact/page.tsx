import type { Metadata } from "next";
import Link from "next/link";

import { InquiryForm } from "@/components/business/inquiry-form";

export const metadata: Metadata = {
  title: "Contact BuildTags Business",
  description: "Tell us about your shop, dealership or brand and we'll set up BuildTags Business with you.",
  alternates: { canonical: "/business/contact" },
};

export default async function BusinessContactPage({ searchParams }: PageProps<"/business/contact">) {
  const sp = await searchParams;
  const interest = typeof sp.interest === "string" ? sp.interest : undefined;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:py-16 lg:px-10">
      <div>
        <Link href="/business" className="label-tech hover:text-foreground">
          ← BuildTags Business
        </Link>
        <p className="eyebrow mt-6">Contact</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">
          <span className="speed-heading">Let&apos;s set up your shop.</span>
        </h1>
        <p className="mt-4 text-foreground/85">
          BuildTags Business is priced for each shop. Tell us a bit about what you build and we&apos;ll get back to you with a setup that fits,
          whether you&apos;re one bay or a dealer group.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li>Custom shops, dealerships, performance shops, tuners and installers</li>
          <li>Cars, trucks, bikes and off-road</li>
          <li>Multi-location, OEM and brand programs</li>
        </ul>
      </div>
      <div className="panel p-5 sm:p-6">
        <InquiryForm defaultInterest={interest} />
      </div>
    </div>
  );
}

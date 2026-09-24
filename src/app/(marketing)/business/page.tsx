import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, ClipboardCheck, KeyRound, Lock, QrCode, ScanLine, Store, Users, Wrench } from "lucide-react";

import { getPublicOrganization } from "@/lib/db/public";
import { BUSINESS_FEATURES } from "@/components/marketing/home-sections";

export const metadata: Metadata = {
  title: "BuildTags Business | For shops, dealers and builders",
  description:
    "Create build pages for customer vehicles, record the parts you install, and hand them off with a private claim link. The customer owns the build. Your shop keeps the credit.",
  alternates: { canonical: "/business" },
};

export const revalidate = 300;

const STEPS = [
  { icon: Wrench, title: "Create the build", body: "Add the customer's vehicle to your business dashboard. It gets its permanent QR right away." },
  { icon: ClipboardCheck, title: "Record your work", body: "Log every part you installed, with photos and specs. Your records are marked as shop installed." },
  { icon: QrCode, title: "Tag it", body: "Design and order the BuildTag decal. It goes on the vehicle before it leaves your bay." },
  { icon: KeyRound, title: "Customer claims it", body: "Hand over a private claim link or a printed claim card. One tap and the build is in their garage." },
];

const BENEFITS = [
  { icon: ScanLine, title: "Every build keeps working for you", body: "Every scan at a meet, a gas station or a bike night shows your work and links back to your shop page." },
  { icon: Lock, title: "Credit that can't be edited away", body: "Parts your shop recorded stay as recorded. The owner can hide one from their page but can't rewrite who installed it." },
  { icon: BadgeCheck, title: "A handoff that feels premium", body: "“Your build is ready” beats a paper invoice. The customer gets a finished build page on day one." },
  { icon: Store, title: "Your business page", body: "Every build you touched, the parts you documented, your socials and your crew in one place." },
  { icon: Users, title: "Your own crew", body: "Start a shop or dealership crew. Customer builds you add show up together, and riders choose to join." },
  { icon: Building2, title: "Built for a team", body: "Owner, admin, manager and staff roles. Everyone works on shop builds; personal garages stay separate." },
];

export default async function BusinessPage() {
  // Link the fictional demo only if it exists in this environment.
  const demo = await getPublicOrganization("blackline-performance").catch(() => null);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/home/moto-shop.webp" alt="" fetchPriority="high" decoding="async" className="size-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,5,13,0.95)_0%,rgba(6,5,13,0.8)_50%,rgba(6,5,13,0.35)_100%)]" />
          <div className="scanlines absolute inset-0" />
        </div>
        <div className="relative mx-auto max-w-[1720px] px-4 pt-20 pb-24 sm:px-6 md:pt-28 md:pb-32 lg:px-10 2xl:px-16">
          <div className="max-w-3xl">
            <p className="eyebrow neon-text">BuildTags Business</p>
            <h1 className="mt-5 text-5xl leading-[0.9] font-extrabold sm:text-6xl md:text-7xl xl:text-8xl">
              <span className="speed-heading">Your shop builds it.</span>
              <br />
              <span className="speed-heading chrome-text">The story keeps going.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base text-foreground/85 sm:text-lg">
              Create build pages for customer vehicles, record the parts you install and hand them off with a private claim link. The customer
              takes ownership. Your shop keeps the credit.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/business/contact" className="btn-signal">
                Talk to us
              </Link>
              <a href="#workflow" className="btn-ghost">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">For custom shops, dealerships, performance shops, tuners and installers. Cars, trucks and bikes.</p>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-[1720px] px-4 py-16 sm:px-6 md:py-24 lg:px-10 2xl:px-16">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Shop builds it. Customer claims it.</span>
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="neon-card p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-7 text-signal" aria-hidden="true" />
                  <span className="font-display text-4xl font-extrabold italic text-foreground/20">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* OWNERSHIP VS CREDIT */}
      <section className="relative border-b border-line bg-[#080712]">
        <div className="absolute inset-0 grid-fade" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1720px] px-4 py-16 sm:px-6 md:py-24 lg:px-10 2xl:px-16">
          <h2 className="max-w-4xl text-4xl sm:text-5xl xl:text-6xl">
            <span className="speed-heading">The customer takes ownership. The shop keeps the credit.</span>
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="neon-card p-6 sm:p-8">
              <p className="label-tech text-neon-cyan">The customer owns</p>
              <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                {["The build page, photos and description", "Privacy: public, unlisted or private", "Their own parts, socials and future upgrades", "The permanent QR on the vehicle (it never changes)", "Whether to join your crew"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon-cyan" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="neon-card border-signal/50 p-6 sm:p-8">
              <p className="label-tech text-signal">Your shop keeps</p>
              <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                {["“Built by” credit on the public page, linked to your business", "Shop-installed badges on the parts you recorded", "Your private customer notes and work order numbers", "The BuildTag orders your business placed", "The build on your business page and crew"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-signal" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
            Scanning the QR on a vehicle only opens its public page. Ownership moves only through the private claim link or code your business
            hands the customer.
          </p>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1720px] px-4 py-16 sm:px-6 md:py-24 lg:px-10 2xl:px-16">
          <p className="eyebrow">Why shops use it</p>
          <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Include a BuildTag with every build.</span>
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <li key={b.title} className="neon-card p-6">
                <b.icon className="size-6 text-neon-cyan" aria-hidden="true" />
                <h3 className="mt-3 text-xl">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* EXAMPLE */}
      <section className="relative border-b border-line bg-[#080712]">
        <div className="relative mx-auto grid max-w-[1720px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:py-24 lg:px-10 2xl:px-16">
          <div>
            <p className="eyebrow">Example</p>
            <h2 className="mt-3 text-4xl sm:text-5xl">
              <span className="speed-heading">One build, start to finish.</span>
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Blackline Performance is a fictional shop we use to show the flow. It is not a real business or customer.
            </p>
            {demo && (
              <Link href={`/org/${demo.slug}`} className="btn-ghost mt-6">
                See the demo shop page
              </Link>
            )}
          </div>
          <ol className="space-y-3">
            {[
              ["Blackline Performance", "creates a build for a customer's 2026 Road Glide and adds it to the Blackline Performance Riders crew."],
              ["The team", "records the exhaust, tune, suspension and audio work, each marked Shop installed."],
              ["The decal", "goes on the bike before delivery. Its QR opens the finished build page."],
              ["At pickup", "the customer gets a claim card, taps Claim my build, and the Road Glide is in their garage."],
              ["After", "the page says Built by Blackline Performance, the parts keep their shop badges, and the customer adds their own photos and upgrades."],
            ].map(([who, what], i) => (
              <li key={who} className="neon-card flex gap-4 p-4">
                <span className="font-display text-3xl leading-none font-extrabold italic text-signal">{i + 1}</span>
                <p className="text-sm text-foreground/85">
                  <span className="font-semibold text-foreground">{who}</span> {what}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ENTERPRISE */}
      <section id="enterprise" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-[1720px] px-4 py-16 sm:px-6 md:py-24 lg:px-10 2xl:px-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow">OEM &amp; enterprise</p>
              <h2 className="mt-3 text-4xl sm:text-5xl">
                <span className="speed-heading">Dealer groups and brands.</span>
              </h2>
              <p className="mt-4 text-foreground/85">
                Running several locations, a dealer network or a parts brand? Every location can have its own business page and team while builds
                keep their full history. Tell us what you need and we&apos;ll scope it with you: multi-location setups, bulk BuildTag
                programs, custom branding, integrations or a brand partnership.
              </p>
              <Link href="/business/contact?interest=oem_partnership" className="btn-ghost mt-6">
                Talk about enterprise
              </Link>
            </div>
            <div className="neon-card p-6 sm:p-8">
              <p className="label-tech text-neon-cyan">BuildTags Business</p>
              <p className="mt-2 font-display text-4xl font-extrabold uppercase">Custom pricing</p>
              <ul className="mt-6 space-y-2 text-sm text-foreground/85">
                {BUSINESS_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon-cyan" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/business/contact" className="btn-signal mt-8 w-full">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-[1720px] px-4 py-16 text-center sm:px-6 md:py-24 lg:px-10 2xl:px-16">
          <h2 className="mx-auto max-w-3xl text-4xl sm:text-5xl">
            <span className="speed-heading">Put your shop on every build you finish.</span>
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/business/contact" className="btn-signal">
              Talk to us
            </Link>
            <Link href="/dashboard/business/register" className="btn-ghost">
              Register your business
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { featuredBuilds } from "@/lib/db/public";
import { siteUrl } from "@/lib/env";
import { scanUrl } from "@/lib/qr/generate";
import { TEMPLATES, renderTagSvg } from "@/lib/tag";
import { BuildCard } from "@/components/build/build-card";
import { BrandChip, EarnShowcase, Faq, Pricing, ShowBuildTag, Ticker } from "@/components/marketing/home-sections";
import { NightCity } from "@/components/marketing/night-city";

export const metadata: Metadata = {
  title: "BuildTag | Your build deserves a spec sheet",
  description:
    "Create your digital build sheet, stick your BuildTag on your car, and let anyone scan to see what's done to it.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

const STEPS = [
  {
    n: "01",
    title: "Build it",
    body: "Add your vehicle, power numbers, photos and every modification. Type fast: category and part name is enough to start.",
    image: "/images/home/hood-open.webp",
    alt: "Blue Subaru with its hood open at a meet",
    color: "text-signal",
  },
  {
    n: "02",
    title: "Tag it",
    body: "Pick a template, shape and style in the Designer. Download vector artwork with the QR protected, print it, stick it on.",
    image: "/images/home/garage-86.webp",
    alt: "White Toyota 86 parked inside a garage",
    color: "text-neon-cyan",
  },
  {
    n: "03",
    title: "Scan it",
    body: "Anyone at the meet, the track or the gas station scans and sees what's done to it. You see the scans.",
    image: "/images/home/meet-crowd.webp",
    alt: "Cars and people gathered at a night car meet",
    color: "text-neon-amber",
  },
];

const FEATURES = [
  { title: "Get paid for your parts", body: "Put your affiliate links on every part. Scans turn into View part taps, taps turn into commissions. BuildTag takes no cut." },
  { title: "Digital build sheet", body: "Every modification in one place, organized by category, with prices if you want them shown." },
  { title: "Permanent BuildTag", body: "One QR that stays with your build. Change anything, never reprint." },
  { title: "Show your power", body: "WHP, torque, dyno, mileage and build cost up front." },
  { title: "Show your socials", body: "The car's Instagram, TikTok and YouTube first. Yours second, or hidden." },
  { title: "Design your tag", body: "Ten shapes, nine automotive styles, QR frames, print-ready SVG and PNG." },
  { title: "Part discovery", body: "Every part can link out. You see which parts people click and which ones are earning." },
];

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof featuredBuilds>> = [];
  try {
    featured = await featuredBuilds(3);
  } catch {
    featured = [];
  }

  // A real decal, rendered by the same code the Designer exports.
  const decal = renderTagSvg(
    TEMPLATES.power.build(),
    {
      scanUrl: scanUrl(siteUrl(), "GHS7K2P9"),
      year: 2022,
      make: "Toyota",
      model: "GR Supra",
      trim: "3.0 Premium",
      nickname: "GHOST",
      powerLabel: "540 WHP",
      torqueLabel: "520 WTQ",
      modCount: 24,
      username: "buildtag_demo",
      socials: [{ public_id: "demo", platform: "instagram", handle: "ghost_supra", source: "vehicle" }],
    },
    { idPrefix: "home-decal", material: false },
  ).svg;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/home/hero-drift.webp" alt="" fetchPriority="high" decoding="async" className="size-full object-cover object-[60%_center]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,5,13,0.92)_0%,rgba(6,5,13,0.75)_45%,rgba(6,5,13,0.25)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,5,13,1)_0%,rgba(6,5,13,0.2)_35%,rgba(6,5,13,0.35)_100%)]" />
          <div className="streaks absolute inset-x-0 bottom-0 h-1/2 opacity-70" />
          <div className="scanlines absolute inset-0" />
        </div>
        <div className="relative mx-auto max-w-[1720px] px-4 pt-20 pb-24 sm:px-6 lg:px-10 2xl:px-16 md:pt-32 md:pb-36 xl:pt-40 xl:pb-44">
          <div className="max-w-2xl xl:max-w-4xl">
            <p className="eyebrow neon-text animate-flicker">Scan the build.</p>
            <h1 className="mt-5 text-[3.1rem] leading-[0.88] font-extrabold sm:text-6xl md:text-7xl lg:text-[6.5rem] xl:text-[7.5rem] 2xl:text-[8.5rem]">
              <span className="speed-heading">Your build</span>
              <br />
              <span className="speed-heading">deserves</span>
              <br />
              <span className="speed-heading chrome-text">a spec sheet.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base text-foreground/85 sm:text-lg xl:max-w-xl xl:text-xl">
              Create your digital build sheet. Stick your BuildTag on your car. Let anyone scan to see what&apos;s done
              to it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-signal">
                Create your build
              </Link>
              <Link href="/build/ghost-2022-toyota-gr-supra" className="btn-ghost">
                See an example
              </Link>
            </div>
            <dl className="mt-10 flex flex-wrap gap-2">
              {[
                ["Permanent", "QR code", "border-signal/50 text-signal"],
                ["Vector", "print export", "border-neon-cyan/50 text-neon-cyan"],
                ["Free", "to start", "border-neon-amber/50 text-neon-amber"],
              ].map(([a, b, cls]) => (
                <div key={a} className={`rounded-md border bg-background/60 px-3 py-2 ${cls}`}>
                  <dt className="font-display text-lg leading-none font-bold uppercase">{a}</dt>
                  <dd className="label-tech mt-1">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Ticker />

      {/* SHOW BUILDTAG */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1720px] px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
          <ShowBuildTag decalSvg={decal} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative overflow-hidden border-b border-line">
        <NightCity />
        <div className="relative mx-auto max-w-[1720px] px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Three steps. One decal.</span>
          </h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="neon-card overflow-hidden">
                <div className="relative aspect-[16/10]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={s.alt} loading="lazy" decoding="async" className="size-full object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(13,11,24,1),transparent_60%)]" />
                  <span className={`absolute bottom-2 left-4 font-display text-6xl leading-none font-extrabold italic ${s.color}`}>{s.n}</span>
                </div>
                <div className="p-6 pt-3">
                  <h3 className="text-2xl">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative border-b border-line bg-[#080712]">
        <div className="absolute inset-0 grid-fade" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1720px] px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-end">
            <div>
              <p className="eyebrow">What you get</p>
              <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
                <span className="speed-heading">Built for people who build.</span>
              </h2>
            </div>
            <p className="text-foreground/80">
              Not a social network. A spec sheet that lives on the car, with the analytics to prove people are reading
              it.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-6">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="neon-card p-6">
                <span className="label-tech">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* EARN */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(255,45,122,0.18),transparent_55%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1720px] px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow neon-text">Your parts list pays you</p>
              <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
                <span className="speed-heading">People scan.</span>
                <br />
                <span className="speed-heading">People ask.</span>
                <br />
                <span className="speed-heading chrome-text">You get paid.</span>
              </h2>
              <p className="mt-6 max-w-lg text-foreground/85">
                Every part on your build sheet can carry your affiliate link. Amazon, eBay, Impact, ShareASale, CJ, or a
                brand that pays you direct. When someone scans your car and taps <span className="font-semibold text-foreground">View part</span>,
                the click goes through your link and the commission is yours.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-foreground/85">
                {[
                  "Paste the link on a part. BuildTag detects the program and adds the disclosure for you.",
                  "Analytics show which parts people tap and how many clicks went to your programs.",
                  "No cut, no minimum, no approval from us. The programs pay you directly.",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-signal shadow-[0_0_10px_var(--signal)]" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="btn-signal">
                  Start earning from your build
                </Link>
                <Link href="/build/ghost-2022-toyota-gr-supra" className="btn-ghost">
                  See it on a build
                </Link>
              </div>
            </div>
            <EarnShowcase />
          </div>
        </div>
      </section>

      {/* STREET GALLERY */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1720px] px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Wherever the car goes</p>
              <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
                <span className="speed-heading">The tag goes too.</span>
              </h2>
            </div>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { src: "/images/home/rolling-e30.webp", alt: "Yellow BMW E30 rolling shot through a lit-up street at night", chip: "Rolling shots" },
              { src: "/images/home/lineup.webp", alt: "Modified cars parked at night under streetlights", chip: "The meet" },
              { src: "/images/home/tunnel-gt3.webp", alt: "Lime green Porsche GT3 in a tunnel at night", chip: "The tunnel run" },
            ].map((g) => (
              <figure key={g.src} className="neon-card relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.alt} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover sm:aspect-[3/4]" />
                <figcaption className="absolute bottom-3 left-3">
                  <BrandChip text={g.chip} />
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="border-b border-line">
          <div className="mx-auto max-w-[1720px] px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Most scanned</p>
                <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
                  <span className="speed-heading">On the streets tonight.</span>
                </h2>
              </div>
              <Link href="/explore" className="btn-ghost btn-small hidden sm:inline-flex">
                Explore all
              </Link>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-7">
              {featured.map((b) => (
                <BuildCard key={b.slug} build={b} />
              ))}
            </div>
            <Link href="/explore" className="btn-ghost mt-8 w-full sm:hidden">
              Explore all
            </Link>
          </div>
        </section>
      )}

      {/* PRICING */}
      <section id="pricing" className="border-b border-line bg-[#080712]">
        <div className="mx-auto max-w-[1720px] px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
          <p className="eyebrow">Plans</p>
          <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Free is the real thing.</span>
          </h2>
          <div className="mt-10">
            <Pricing />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-3xl xl:max-w-4xl px-4 py-16 sm:px-6 lg:px-10 2xl:px-16 md:py-24">
          <p className="eyebrow">Questions</p>
          <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Before you print.</span>
          </h2>
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/home/fog-lights.webp" alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,5,13,0.9),rgba(6,5,13,0.55),rgba(6,5,13,0.95))]" />
          <div className="streaks absolute inset-0 opacity-60" />
        </div>
        <div className="relative mx-auto max-w-[1720px] px-4 py-24 text-center sm:px-6 lg:px-10 2xl:px-16 md:py-32">
          <h2 className="neon-text text-5xl sm:text-7xl md:text-8xl">
            <span className="speed-heading">What&apos;s done to it?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-foreground/85">
            Stop answering the same question in every parking lot. Put the answer on the car.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-signal">
              Create your build
            </Link>
            <Link href="/explore" className="btn-ghost">
              Explore builds
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

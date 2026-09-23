import type { Metadata } from "next";
import Link from "next/link";

import { featuredBuilds } from "@/lib/db/public";
import { BuildCard } from "@/components/build/build-card";
import { ConceptShowcase } from "@/components/marketing/concept-showcase";
import { NightCity } from "@/components/marketing/night-city";

export const metadata: Metadata = {
  title: "BuildTag | Your build deserves a spec sheet",
  description:
    "Create your digital build sheet, stick your BuildTag on your car, and let anyone scan to see what's done to it.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

const STEPS = [
  { n: "01", title: "Build it", body: "Add your vehicle, performance specs and every modification.", color: "text-signal" },
  { n: "02", title: "Tag it", body: "Design your permanent BuildTag decal and print it.", color: "text-neon-cyan" },
  { n: "03", title: "Scan it", body: "Anyone can instantly see what's done to your ride.", color: "text-neon-amber" },
];

const FEATURES = [
  { title: "Digital build sheet", body: "Every modification in one place, organized by category." },
  { title: "Permanent BuildTag", body: "One QR that stays with your build. Change anything, never reprint." },
  { title: "Show your power", body: "Display WHP, torque and build specifications up front." },
  { title: "Show your socials", body: "Connect your vehicle's Instagram, TikTok and YouTube." },
  { title: "Design your tag", body: "Create an automotive decal that matches your build." },
  { title: "Part discovery", body: "Let people see exactly which parts you're running." },
];

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof featuredBuilds>> = [];
  try {
    featured = await featuredBuilds(3);
  } catch {
    featured = [];
  }

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line">
        <NightCity />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-24 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-24 md:pb-32">
          <div>
            <p className="eyebrow neon-text animate-flicker">Scan the build.</p>
            <h1 className="mt-5 text-[3rem] leading-[0.9] font-extrabold sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="speed-heading">Your build</span>
              <br />
              <span className="speed-heading">deserves</span>
              <br />
              <span className="speed-heading chrome-text">a spec sheet.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base text-foreground/80 sm:text-lg">
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
            <dl className="mt-10 flex max-w-lg flex-wrap gap-2">
              {[
                ["Permanent", "QR code", "border-signal/50 text-signal"],
                ["Vector", "print export", "border-neon-cyan/50 text-neon-cyan"],
                ["Free", "to start", "border-neon-amber/50 text-neon-amber"],
              ].map(([a, b, cls]) => (
                <div key={a} className={`rounded-md border bg-background/60 px-3 py-2 backdrop-blur ${cls}`}>
                  <dt className="font-display text-lg leading-none font-bold uppercase">{a}</dt>
                  <dd className="label-tech mt-1">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ConceptShowcase />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">
            <span className="speed-heading">Three steps. One decal.</span>
          </h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="neon-card overflow-hidden p-6">
                <span className={`font-display text-6xl leading-none font-extrabold italic ${s.color}`}>{s.n}</span>
                <h3 className="mt-4 text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                <span className="absolute -right-6 -bottom-6 size-20 rotate-45 border-t border-line" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative border-b border-line bg-[#080712]">
        <div className="absolute inset-0 grid-fade" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">
            <span className="speed-heading">Built for people who build.</span>
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Most scanned</p>
                <h2 className="mt-3 text-4xl sm:text-5xl">
                  <span className="speed-heading">On the streets tonight.</span>
                </h2>
              </div>
              <Link href="/explore" className="btn-ghost btn-small hidden sm:inline-flex">
                Explore all
              </Link>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,45,122,0.25),transparent_60%)]" aria-hidden="true" />
        <div className="streaks absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 md:py-28">
          <h2 className="neon-text text-5xl sm:text-7xl">
            <span className="speed-heading">What&apos;s done to it?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-foreground/80">
            Stop answering the same question in every parking lot. Put the answer on the car.
          </p>
          <Link href="/signup" className="btn-signal mt-8">
            Create your build
          </Link>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { featuredBuilds } from "@/lib/db/public";
import { BuildCard } from "@/components/build/build-card";
import { ConceptShowcase } from "@/components/marketing/concept-showcase";

export const metadata: Metadata = {
  title: "BuildTag | Your build deserves a spec sheet",
  description:
    "Create your digital build sheet, stick your BuildTag on your car, and let anyone scan to see what's done to it.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

const STEPS = [
  { n: "01", title: "Build it", body: "Add your vehicle, performance specs and every modification." },
  { n: "02", title: "Tag it", body: "Design your permanent BuildTag decal and print it." },
  { n: "03", title: "Scan it", body: "Anyone can instantly see what's done to your ride." },
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
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-24 md:pb-28">
          <div>
            <p className="eyebrow">Scan the build.</p>
            <h1 className="mt-4 text-[2.9rem] leading-[0.95] font-bold sm:text-6xl md:text-7xl">
              Your build deserves
              <br />
              a spec sheet.
            </h1>
            <p className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
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
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                ["Permanent", "QR code"],
                ["Vector", "print export"],
                ["Free", "to start"],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt className="font-display text-xl font-bold uppercase">{a}</dt>
                  <dd className="label-tech">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ConceptShowcase />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Three steps. One decal.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="panel p-6">
                <span className="font-display text-5xl font-bold text-signal">{s.n}</span>
                <h3 className="mt-4 text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-line bg-[#0c0c0e]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Built for people who build.</h2>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="bg-background p-6">
                <h3 className="text-xl">{f.title}</h3>
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
                <h2 className="mt-3 text-4xl sm:text-5xl">On the road now.</h2>
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
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 md:py-28">
          <h2 className="text-4xl sm:text-6xl">What&apos;s done to it?</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
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

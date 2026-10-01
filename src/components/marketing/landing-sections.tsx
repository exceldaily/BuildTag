import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { DecalImage } from "@/lib/landing";
import { photoUrl } from "@/lib/storage";
import { MOD_CATEGORY_LABEL, type Crew, type ModCategory, type PublicBuild, type PublicBuildListRow, type SocialPlatform } from "@/lib/types";
import { cn, formatCount, powerLabel, vehicleTitle } from "@/lib/utils";
import { BOARDS, type BoardBuildRow } from "@/lib/leaderboards";
import { BuildCard } from "@/components/build/build-card";
import { OpenPlace, StandingBuild } from "@/components/leaderboard/board-ui";
import { SocialIcon } from "@/components/build/social-icon";

import { BuildScreen, CameraScreen, Container, Decal, Mono, Phone, PhysicalTag, SectionHead, Viewfinder } from "./landing-ui";

/** Lowest orderable BuildTag price (3 x 3 in gloss or matte, buildtag.print_specifications). */
export const DECAL_FROM = "$8.99";

const SECTION = "relative border-b border-line";
const PAD = "py-16 md:py-24";

function builtByOf(b: PublicBuild) {
  return b.contributors.find((c) => c.organization && c.roles.some((r) => r === "creator" || r === "builder" || r === "dealer"))?.organization ?? null;
}

/** Slash-separated mono list: MODS / PHOTOS / POWER. */
function SlashList({ items, className }: { items: string[]; className?: string }) {
  return (
    <p className={cn("font-mono text-[11px] leading-relaxed tracking-[0.14em] text-foreground/60 uppercase", className)}>
      {items.map((it, i) => (
        <span key={it}>
          {i > 0 && <span className="px-2 text-signal">/</span>}
          {it}
        </span>
      ))}
    </p>
  );
}

/* =============================================================================
 * VALUE STRIP: what sits behind the tag, in one line
 * ========================================================================== */
const VALUE = [
  { title: "Mods & parts", body: "Every part, by category." },
  { title: "Specs & power", body: "HP, torque, the numbers." },
  { title: "Photos & socials", body: "The build and where to follow it." },
  { title: "Scan analytics", body: "See who's looking." },
];

export function ValueStrip() {
  return (
    <section className={cn(SECTION, "bg-[#0a0813]")} aria-label="What a BuildTag holds">
      <Container className="grid gap-6 py-8 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16 lg:py-10">
        <p className="font-display text-3xl leading-none font-extrabold uppercase italic sm:text-4xl">
          Your build. <span className="text-signal">One scan.</span>
        </p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
          {VALUE.map((v, i) => (
            <li key={v.title}>
              <Mono className="text-signal">0{i + 1}</Mono>
              <p className="mt-1.5 font-display text-base font-bold tracking-wide uppercase sm:text-lg">{v.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{v.body}</p>
            </li>
          ))}
          {/* the earning angle, one tap from its section */}
          <li className="col-span-2 sm:col-span-1">
            <a href="#earn" className="group block border-l-2 border-signal pl-3" data-event="explore_build_clicked">
              <Mono className="text-signal">05</Mono>
              <p className="mt-1.5 font-display text-base font-bold tracking-wide text-signal uppercase sm:text-lg">
                Affiliate links <ArrowUpRight className="inline size-4 transition-transform group-hover:translate-x-0.5 sm:max-lg:hidden" aria-hidden="true" />
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Your parts list can pay you back.</p>
            </a>
          </li>
        </ul>
      </Container>
    </section>
  );
}

/* =============================================================================
 * THE SCANNER'S SIDE: see it, scan it, read it. With a real permanent code.
 * ========================================================================== */
const SCAN_FLOW = ["See the build", "Scan the tag", "View the full build"];

export function ScanDemo({ car, qr, link }: { car: PublicBuild | null; qr: string; link: string }) {
  const pretty = link.replace(/^https?:\/\//, "");
  const buildHref = car ? `/build/${car.slug}?via=tag` : "/explore";
  return (
    <section id="scan-demo" className={cn(SECTION, "cv-auto scroll-mt-16 overflow-hidden bg-[#0a0813]")}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_36%_55%_at_82%_50%,rgba(255,45,122,0.09),transparent_70%)]" aria-hidden="true" />
      <Container className={cn("relative grid items-center gap-12 lg:grid-cols-[1fr_auto_auto] lg:gap-20", PAD)}>
        <div className="max-w-2xl">
          <p className="eyebrow">
            <span className="text-foreground/45">03 / </span>On the other side of the scan
          </p>
          <h2 className="mt-3 text-4xl leading-[0.95] sm:text-5xl xl:text-6xl">
            <span className="speed-heading">See a build you like?</span>
            <br />
            <span className="speed-heading chrome-text">Scan it.</span>
          </h2>
          <p className="mt-5 text-base text-foreground/75 sm:text-lg">
            A BuildTag gives anyone instant access to the owner&apos;s build profile: parts, mods, specs, photos, socials and more.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            No app. Any phone camera.
            {car ? ` Try it: this is the real, permanent code on ${car.nickname}, a ${[powerLabel(car.horsepower, car.horsepower_type), vehicleTitle(car)].filter(Boolean).join(" ")}.` : ""}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={buildHref} className="btn-signal md:hidden" data-event="hero_demo_opened">
              Open demo build
            </Link>
            <Link href={buildHref} className="btn-ghost hidden md:inline-flex" data-event="hero_demo_opened">
              No phone handy? Open it here
            </Link>
          </div>
        </div>

        {/* the flow, top to bottom */}
        <ol className="mx-auto flex w-full max-w-[300px] flex-col items-center text-center lg:w-auto" aria-label="How a scan works">
          {SCAN_FLOW.map((step, i) => (
            <li key={step} className="flex flex-col items-center">
              {i > 0 && (
                <svg viewBox="0 0 12 40" className="my-3 h-10 w-3 text-signal" aria-hidden="true">
                  <path d="M6 0 V34" stroke="currentColor" strokeWidth="1.5" className="flow-dash" />
                  <path d="M1 31 L6 38 L11 31" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              )}
              <Mono className="text-signal">0{i + 1}</Mono>
              <span className={cn("mt-1.5 font-display text-2xl leading-none font-bold tracking-[0.06em] uppercase italic sm:text-3xl", i === 1 && "text-signal")}>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mx-auto w-full max-w-[280px]">
          <div className="relative rounded-sm bg-white p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] sm:p-5">
            <div role="img" aria-label={`QR code for ${pretty}`} className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <Viewfinder tone="signal" />
          </div>
          <p className="mt-5 text-center">
            <a href={link} className="font-mono text-sm text-foreground/80 underline decoration-signal/60 underline-offset-4 hover:text-foreground" data-event="hero_demo_scanned">
              {pretty}
            </a>
          </p>
          <p className="mt-2 text-center">
            <Mono>Point your camera here</Mono>
          </p>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * THE LOOP: build it, tag it, scan it, keep building. One connected line.
 * ========================================================================== */
export function BuildLoop({ bike, decal, link }: { bike: PublicBuild | null; decal: DecalImage | null; link: string }) {
  if (!bike || !decal) return null;
  const backdrop = bike.photos[0] ? photoUrl(bike.photos[0].storage_path, "thumb") : (bike.hero_image_url ?? "");
  const steps = [
    {
      n: "01",
      title: "Build it",
      body: "Create the vehicle profile.",
      list: ["Mods", "Photos", "Power", "Parts", "Socials"],
      visual: (
        <Phone className="mx-auto w-[64%]">
          <BuildScreen build={bike} mods={4} viaTag={false} />
        </Phone>
      ),
    },
    {
      n: "02",
      title: "Tag it",
      body: "Design it, approve the proof, order it. Printed, cut and shipped.",
      list: ["Gloss or matte", "3 to 5 in", `From ${DECAL_FROM}`],
      visual: (
        <div className="relative mx-auto flex aspect-[9/13] w-[80%] items-center justify-center">
          <div className="absolute inset-x-[8%] bottom-[14%] h-[10%] rounded-[50%] bg-black/70 blur-xl" aria-hidden="true" />
          <PhysicalTag decal={decal} className={decal.width > decal.height * 1.2 ? "w-[112%] max-w-none shrink-0" : "w-[72%]"} />
        </div>
      ),
    },
    {
      n: "03",
      title: "Scan it",
      body: "Any phone camera, no app. The build opens right there.",
      list: ["Meets", "Gas stations", "Bike nights", "Shows"],
      visual: (
        <Phone className="mx-auto w-[64%]">
          <CameraScreen decal={decal} backdrop={backdrop} link={link.replace(/^https?:\/\//, "")} />
        </Phone>
      ),
    },
  ];
  return (
    <section id="how-it-works" className={cn(SECTION, "cv-auto scroll-mt-16 overflow-hidden")}>
      <div className="eng-paper absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_70%,transparent)]" aria-hidden="true" />
      <Container className={cn("relative", PAD)}>
        <SectionHead
          index="08"
          eyebrow="How it works"
          title={
            <>
              <span className="speed-heading">Build it.</span> <span className="speed-heading">Tag it.</span> <span className="speed-heading chrome-text">Scan it.</span>
            </>
          }
        />
        <ol className="relative mt-14 grid gap-14 md:grid-cols-3 md:gap-8">
          {/* the line that connects the three stages */}
          <span className="absolute top-[7px] right-[8%] left-[8%] hidden h-px bg-[linear-gradient(to_right,transparent,rgba(255,45,122,0.7)_12%,rgba(255,45,122,0.7)_88%,transparent)] md:block" aria-hidden="true" />
          <span className="absolute top-0 bottom-0 left-[7px] w-px bg-signal/40 md:hidden" aria-hidden="true" />
          {steps.map((s) => (
            <li key={s.n} className="reveal relative pl-8 md:pl-0">
              <span className="absolute top-[3px] left-0 size-[15px] border border-signal bg-background md:relative md:top-auto md:left-auto md:mx-auto md:block" aria-hidden="true" />
              <div className="flex items-center gap-3 md:mt-5 md:justify-center">
                <Mono className="text-signal">{s.n}</Mono>
                <span className="font-display text-2xl leading-none font-bold uppercase italic">{s.title}</span>
              </div>
              <div className="mt-8 max-w-[300px] md:mx-auto">{s.visual}</div>
              <p className="mt-6 text-sm text-foreground/75 md:text-center">{s.body}</p>
              <SlashList items={s.list} className="mt-2 md:text-center" />
            </li>
          ))}
        </ol>
        <div className="reveal mt-16 grid gap-6 border-t border-line pt-8 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
          <div className="flex items-start gap-4">
            <Mono className="mt-2 text-signal">+</Mono>
            <p className="font-display text-4xl leading-[0.9] font-extrabold uppercase italic sm:text-5xl">
              One permanent tag.
              <br />
              <span className="text-signal">An ever-evolving build.</span>
            </p>
          </div>
          <p className="max-w-md text-sm text-foreground/75 md:justify-self-end">
            Keep building. The QR holds a permanent code, not a page name, so new mods, new wheels or a new nickname never mean a new tag.
          </p>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * THE REAL PRODUCT: a build page with engineering callouts
 * ========================================================================== */
const LEFT_CALLOUTS = [
  { top: "18%", title: "Photos", body: "The shots that stop people." },
  { top: "44%", title: "HP, torque, engine", body: "WHP or crank, torque, dyno and mileage." },
  { top: "61%", title: "Social links", body: "The vehicle's accounts come first." },
  { top: "80%", title: "Build history", body: "When it started and what changed." },
];
const RIGHT_CALLOUTS = [
  { top: "36%", title: "Scan statistics", body: "Scans, likes and part clicks, in your garage." },
  { top: "62%", title: "Full mod list", body: "Organized by category." },
  { top: "76%", title: "Brands and parts", body: "Exactly what's installed, and who installed it." },
  { top: "88%", title: "Part links", body: "Tap through to the exact part." },
];

export function Showcase({ car, crew }: { car: PublicBuild | null; crew: { name: string; slug: string } | null }) {
  if (!car) return null;
  const all = [...LEFT_CALLOUTS, ...RIGHT_CALLOUTS];
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden bg-[#080712]")}>
      <p className="ghost-type pointer-events-none absolute top-[18%] left-1/2 hidden -translate-x-1/2 text-[18vw] text-white/[0.03] lg:block" aria-hidden="true">
        {car.nickname}
      </p>
      <Container className={cn("relative", PAD)}>
        <SectionHead
          center
          index="05"
          eyebrow="The build profile"
          title={
            <>
              <span className="speed-heading">More than</span> <span className="speed-heading chrome-text">a QR code.</span>
            </>
          }
          lede={`Every tag connects to a living build profile you can update as your vehicle changes. This one is ${car.nickname}'s, the page its BuildTag opens.`}
        />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_330px_1fr] lg:gap-0 xl:grid-cols-[1fr_360px_1fr]">
          <Callouts items={LEFT_CALLOUTS} side="left" start={1} />
          <Link href={`/build/${car.slug}`} className="reveal mx-auto block w-full max-w-[330px] xl:max-w-[360px]" aria-label={`Open ${car.nickname}'s build page`} data-event="explore_build_clicked">
            <Phone className="shadow-[inset_-1px_0_0_rgba(255,45,122,0.5),0_50px_80px_-30px_rgba(0,0,0,1)]">
              <BuildScreen build={car} crew={crew} mods={4} />
            </Phone>
          </Link>
          <Callouts items={RIGHT_CALLOUTS} side="right" start={5} />
        </div>
        <ol className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:hidden">
          {all.map((c, i) => (
            <li key={c.title} className="border-t border-line pt-3">
              <Mono className="text-signal">{String(i + 1).padStart(2, "0")}</Mono>
              <p className="mt-2 font-display text-sm font-bold tracking-wide uppercase">{c.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function Callouts({ items, side, start }: { items: { top: string; title: string; body: string }[]; side: "left" | "right"; start: number }) {
  return (
    <div className="relative hidden h-full min-h-[640px] lg:block" aria-hidden="true">
      {items.map((c, i) => (
        <div key={c.title} className={cn("absolute inset-x-0 flex -translate-y-1/2 items-center gap-3", side === "right" && "flex-row-reverse")} style={{ top: c.top }}>
          <div className={cn("w-[46%] shrink-0 xl:w-[42%]", side === "left" ? "text-right" : "text-left")}>
            <Mono className="text-signal">{String(start + i).padStart(2, "0")}</Mono>
            <p className="mt-1.5 font-display text-base font-bold tracking-wide uppercase">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.body}</p>
          </div>
          <span className="h-px flex-1 bg-foreground/30" />
          <span className="relative -mx-1 size-2 shrink-0 border border-signal bg-background" />
        </div>
      ))}
    </div>
  );
}

/* =============================================================================
 * WHAT YOU GET: a spec sheet, not a card grid
 * ========================================================================== */
const SOCIAL_ROW: SocialPlatform[] = ["instagram", "tiktok", "youtube", "facebook", "x", "website"];
const METRICS = ["Scans", "Likes", "Part clicks", "Social clicks", "Affiliate clicks", "Top parts", "Devices", "Countries"];

export function Benefits({ car, bagger }: { car: PublicBuild | null; bagger: PublicBuild | null }) {
  const linked = bagger?.modifications.find((m) => m.has_link && m.category === "exhaust") ?? bagger?.modifications.find((m) => m.has_link) ?? null;
  const stats: [string, string][] = car
    ? [
        ...(car.horsepower ? [[formatCount(car.horsepower), car.horsepower_type] as [string, string]] : []),
        ...(car.torque ? [[formatCount(car.torque), car.horsepower_type === "WHP" ? "WTQ" : "TQ"] as [string, string]] : []),
        [formatCount(car.mod_count), "Mods"],
      ]
    : [];
  const rows = [
    {
      title: "Show it off",
      body: "Your complete build in one place. Mods, power, photos, parts and specs.",
      evidence: stats.length > 0 && (
        <dl className="flex gap-8">
          {stats.map(([v, l]) => (
            <div key={l} className="flex flex-col-reverse">
              <dt className="mt-1.5">
                <Mono>{l}</Mono>
              </dt>
              <dd className="font-display text-4xl leading-none font-extrabold italic tabular-nums">{v}</dd>
            </div>
          ))}
          {car && (
            <div className="self-end">
              <Mono className="text-foreground/40">{car.nickname} · demo build</Mono>
            </div>
          )}
        </dl>
      ),
    },
    {
      title: "Grow your following",
      body: "Turn real-world attention into followers. The vehicle's accounts first, yours second or hidden.",
      evidence: (
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {SOCIAL_ROW.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <SocialIcon platform={p} className="size-4 text-foreground/85" />
              <Mono>{p === "x" ? "X" : p}</Mono>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Make your parts list work",
      body: "Someone asks “what exhaust is that?” They scan and find it. Link every part to where it's sold, and use your own affiliate links where you have them.",
      evidence: linked && (
        <div className="flex items-center justify-between gap-4 border-y border-line py-3">
          <div className="min-w-0">
            <p className="truncate text-sm">
              {linked.brand && <span className="text-foreground/60">{linked.brand} </span>}
              {linked.part_name}
            </p>
            <Mono className="mt-1 block">{MOD_CATEGORY_LABEL[linked.category]}</Mono>
          </div>
          {/* Same click-tracked redirect a scanner uses on the real build page. */}
          <a
            href={`/out/${bagger!.slug}/part/${linked.public_id}`}
            target="_blank"
            rel={linked.is_affiliate ? "noopener noreferrer nofollow sponsored" : "noopener noreferrer nofollow"}
            className="inline-flex shrink-0 items-center gap-1 font-display text-xs font-bold tracking-[0.12em] text-signal uppercase underline-offset-4 hover:underline"
            aria-label={`View part: ${[linked.brand, linked.part_name].filter(Boolean).join(" ")} (opens the seller's site)`}
            data-event="explore_build_clicked"
          >
            View part <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      ),
    },
    {
      title: "Know who's looking",
      body: "See the engagement around your BuildTag, right in your garage.",
      evidence: <SlashList items={METRICS} />,
    },
  ];
  return (
    <section className={cn(SECTION, "cv-auto")}>
      <Container className={PAD}>
        <SectionHead
          index="06"
          eyebrow="What you get"
          title={
            <>
              <span className="speed-heading">Built for people</span>
              <br />
              <span className="speed-heading chrome-text">who actually build.</span>
            </>
          }
        />
        <ol className="mt-12 border-t border-foreground/20">
          {rows.map((r, i) => (
            <li key={r.title} className="reveal grid gap-4 border-b border-line py-7 md:grid-cols-[64px_minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-8">
              <Mono className="text-signal">{String(i + 1).padStart(2, "0")}</Mono>
              <div>
                <h3 className="text-2xl sm:text-3xl">{r.title}</h3>
                <p className="mt-1.5 max-w-md text-sm text-foreground/70">{r.body}</p>
              </div>
              <div>{r.evidence}</div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* =============================================================================
 * THE PROBLEM: the same five questions, every time it's parked
 * ========================================================================== */
const QUESTIONS = ["What exhaust is that?", "What wheels are those?", "What suspension are you running?", "How much power does it make?", "What all have you done to it?"];

/** Where the tag sits on the campaign photo (percent of the image): rear quarter glass. */
const TAG_ON_GLASS = { left: 24.6, top: 23.5, width: 8.6 };

export function SameQuestions({ build, decal }: { build: PublicBuild | null; decal: DecalImage | null }) {
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden bg-[#080712]")}>
      <Container className={cn("grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16 xl:gap-24", PAD)}>
        <div>
          <p className="eyebrow">
            <span className="text-foreground/45">02 / </span>Every meet. Every gas station.
          </p>
          <h2 className="mt-3 text-4xl leading-[0.95] sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Tired of answering</span>
            <br />
            <span className="speed-heading chrome-text">the same questions?</span>
          </h2>
          <ul className="mt-8 border-t border-line">
            {QUESTIONS.map((q) => (
              <li key={q} className="border-b border-line py-2.5 font-display text-lg leading-tight font-semibold tracking-wide text-foreground/55 italic sm:text-xl">
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
          <p className="mt-10 font-display text-5xl leading-[0.88] font-extrabold uppercase italic sm:text-6xl xl:text-7xl">
            They&apos;ll ask.
            <br />
            Your <span className="text-signal">BuildTag</span> answers.
          </p>
        </div>

        {build && decal && (
          <figure className="reveal relative">
            <div className="relative overflow-hidden rounded-sm border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/home/tagged-wrx.webp" width={806} height={640} alt={`${vehicleTitle(build)} with a BuildTag on the rear quarter window`} loading="lazy" decoding="async" className="block h-auto w-full" />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,7,18,0.85),transparent_45%),linear-gradient(to_left,rgba(8,7,18,0.55),transparent_50%)]" aria-hidden="true" />
              {/* the tag, on the glass */}
              <div className="absolute" style={{ left: `${TAG_ON_GLASS.left}%`, top: `${TAG_ON_GLASS.top}%`, width: `${TAG_ON_GLASS.width}%` }}>
                <div className="relative">
                  <Decal decal={decal} className="opacity-95" />
                  <Viewfinder tone="signal" />
                </div>
              </div>
              {/* from the tag to the phone */}
              <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 34.5 30 L 52 30 L 64 46" stroke="var(--signal)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" className="flow-dash" />
              </svg>
            </div>
            <Link
              href={`/build/${build.slug}?via=tag`}
              className="absolute right-[3%] bottom-0 block w-[38%] sm:w-[33%]"
              aria-label={`Open ${build.nickname || vehicleTitle(build)}'s build profile`}
              data-event="explore_build_clicked"
            >
              <Phone className="shadow-[inset_-1px_0_0_rgba(255,45,122,0.5),0_40px_70px_-25px_rgba(0,0,0,1)]">
                <BuildScreen build={build} mods={3} />
              </Phone>
            </Link>
            <figcaption className="mt-3 min-h-16 max-w-[54%] leading-relaxed sm:min-h-12">
              <Mono>
                {[build.nickname, vehicleTitle(build)].filter(Boolean).join(" · ")} · demo build, tag placement illustrated
              </Mono>
            </figcaption>
          </figure>
        )}
      </Container>
    </section>
  );
}

/* =============================================================================
 * AFFILIATE LINKS: the parts list can earn. Build, scan, click, purchase.
 * ========================================================================== */
const EARN_STEPS = [
  { title: "Add your parts", body: "Build your mod list and link the products you actually use." },
  { title: "Get scanned", body: "Your BuildTag connects the physical vehicle directly to its digital build page." },
  { title: "Earn from your build", body: "Use your eligible affiliate links so traffic from your build can potentially generate commissions." },
];
/** Desktop: the full path, left to right. */
const EARN_FLOW = ["Build", "BuildTag QR", "Scan", "Part list", "Click", "Purchase", "Commission"];
/** Phones: the same path as a short vertical story. */
const EARN_STORY = [
  { step: "Build", body: "List the parts on your build." },
  { step: "Scan", body: "Someone scans the BuildTag." },
  { step: "Discover", body: "They open your part list." },
  { step: "Buy", body: "They tap through and purchase." },
  { step: "Earn", body: "An eligible link may earn you a commission." },
];
/** Illustration only. Labeled as example data wherever it shows. */
const EARN_EXAMPLE: { label: string; value: string; note: string }[] = [
  { label: "Part clicks", value: "184", note: "Counted by BuildTags" },
  { label: "Product views", value: "327", note: "Counted by BuildTags" },
  { label: "Est. commission", value: "$42.80", note: "Reported by your affiliate program" },
];

export function EarnFromBuild({ build }: { build: PublicBuild | null }) {
  // Lead with the parts people ask about most.
  const rank = (c: ModCategory) => (c === "exhaust" ? 0 : c === "suspension" ? 1 : c === "intake" ? 2 : 3);
  const seen = new Set<ModCategory>();
  const parts = [...(build?.modifications.filter((m) => m.has_link) ?? [])]
    .sort((a, b) => rank(a.category) - rank(b.category))
    .filter((m) => !seen.has(m.category) && seen.add(m.category))
    .slice(0, 3);

  return (
    <section id="earn" className={cn(SECTION, "cv-auto scroll-mt-16 overflow-hidden bg-[#080712]")}>
      <div className="eng-paper absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,transparent,#000_25%,#000_75%,transparent)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_34%_48%_at_78%_38%,rgba(255,45,122,0.1),transparent_70%)]" aria-hidden="true" />
      <Container className={cn("relative", PAD)}>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 xl:gap-24">
          {/* ---------- the pitch ---------- */}
          <div>
            <p className="eyebrow">
              <span className="text-foreground/45">04 / </span>Affiliate links
            </p>
            <h2 className="mt-3 text-4xl leading-[0.95] sm:text-5xl xl:text-6xl">
              <span className="speed-heading">Your build can</span>
              <br />
              <span className="speed-heading chrome-text">pay you back.</span>
            </h2>
            <p className="mt-5 font-display text-xl leading-tight font-bold tracking-[0.06em] uppercase sm:text-2xl">
              List the parts. Share the build. <span className="text-signal">Earn from it.</span>
            </p>
            <p className="mt-4 max-w-xl text-base text-foreground/75 sm:text-lg">
              Add your own affiliate links to the parts on your build. When someone scans your BuildTag, checks out your setup, and purchases through an eligible affiliate link, you may earn a
              commission.
            </p>
            <ol className="mt-8 divide-y divide-line border-y border-line">
              {EARN_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4 py-3.5">
                  <Mono className="mt-1.5 text-signal">0{i + 1}</Mono>
                  <div>
                    <p className="font-display text-lg leading-none font-bold tracking-wide uppercase">{s.title}</p>
                    <p className="mt-1.5 text-sm text-foreground/70">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/signup" className="btn-signal mt-8" data-event="signup_started">
              Monetize your build
            </Link>
            <p className="mt-5 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Affiliate earnings depend on the user&apos;s affiliate programs, eligibility, attribution and applicable program terms. BuildTags does not guarantee commissions or earnings.
            </p>
          </div>

          {/* ---------- the interface: a part list being tapped, and what it adds up to ---------- */}
          <figure className="reveal relative">
            <div className="border border-foreground/20 bg-background shadow-[0_40px_80px_-40px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between gap-3 border-b border-foreground/20 px-4 py-3 sm:px-5">
                <Mono className="text-foreground/80">Build page / Part list</Mono>
                {build && <Mono className="truncate">{[build.nickname, build.model].filter(Boolean).join(" · ")}</Mono>}
              </div>
              <ul className="divide-y divide-line">
                {parts.map((m, i) => (
                  <li key={m.public_id} className={cn("flex items-center justify-between gap-4 px-4 py-4 sm:px-5", i === 0 && "bg-signal/[0.06]")}>
                    <div className="min-w-0">
                      <Mono className="block text-signal">{MOD_CATEGORY_LABEL[m.category]}</Mono>
                      <p className="mt-1.5 truncate font-display text-lg leading-none font-bold tracking-wide uppercase sm:text-xl">{m.part_name}</p>
                      {m.brand && <p className="mt-1 truncate text-xs text-muted-foreground">{m.brand}</p>}
                    </div>
                    {/* Same click-tracked redirect a scanner uses on the real build page. */}
                    <a
                      href={`/out/${build!.slug}/part/${m.public_id}`}
                      target="_blank"
                      rel={m.is_affiliate ? "noopener noreferrer nofollow sponsored" : "noopener noreferrer nofollow"}
                      className={cn(
                        "relative inline-flex h-9 shrink-0 items-center gap-1.5 border px-3 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors",
                        i === 0 ? "border-signal bg-signal text-white" : "border-foreground/30 hover:border-signal hover:text-signal",
                      )}
                      aria-label={`View part: ${[m.brand, m.part_name].filter(Boolean).join(" ")} (opens the seller's site)`}
                      data-event="explore_build_clicked"
                    >
                      View part <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      {/* the tap */}
                      {i === 0 && (
                        <span className="hotspot absolute -right-1.5 -bottom-1.5 size-3" aria-hidden="true">
                          <span className="absolute inset-0 rounded-full bg-white" />
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>

              {/* readout */}
              <div className="border-t border-foreground/20">
                <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
                  <Mono className="text-foreground/80">Link performance</Mono>
                  <Mono className="border border-signal/60 px-1.5 py-1 text-signal">Example data</Mono>
                </div>
                <dl className="grid grid-cols-3 divide-x divide-line px-1 pt-2 pb-4 sm:px-2">
                  {EARN_EXAMPLE.map((e, i) => (
                    <div key={e.label} className="flex flex-col-reverse px-3">
                      <dt>
                        <Mono className="block">{e.label}</Mono>
                        <span className="mt-1 hidden text-[10px] leading-tight text-muted-foreground sm:block">{e.note}</span>
                      </dt>
                      <dd className={cn("mb-1.5 font-display text-3xl leading-none font-extrabold italic tabular-nums sm:text-5xl", i === 2 && "text-signal")}>{e.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Example numbers to show the idea, not real results. BuildTags counts the clicks. Your affiliate program tracks purchases and pays any commission.
            </figcaption>
          </figure>
        </div>

        {/* ---------- the path. Desktop: seven stations on one line. ---------- */}
        <ol className="relative mt-16 hidden grid-cols-7 md:grid" aria-label="From build to commission">
          <svg className="pointer-events-none absolute top-[5px] right-[7%] left-[7%] h-px w-[86%] overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 1" aria-hidden="true">
            <path d="M0 0.5 H100" stroke="var(--signal)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" className="flow-dash" />
          </svg>
          {EARN_FLOW.map((s, i) => {
            const last = i === EARN_FLOW.length - 1;
            return (
              <li key={s} className="relative flex flex-col items-center text-center">
                <span className={cn("relative size-[11px] border border-signal", last ? "bg-signal" : "bg-background")} aria-hidden="true" />
                <Mono className="mt-4 block text-signal">0{i + 1}</Mono>
                <span className={cn("mt-1.5 font-display text-sm font-bold tracking-[0.12em] uppercase lg:text-base", last && "text-signal")}>{s}</span>
              </li>
            );
          })}
        </ol>

        {/* ---------- Phones: the same path as a vertical story. ---------- */}
        <ol className="relative mt-12 space-y-6 pl-8 md:hidden" aria-label="From build to commission">
          <svg className="pointer-events-none absolute top-1 bottom-1 left-[5px] h-[calc(100%-0.5rem)] w-px overflow-visible" preserveAspectRatio="none" viewBox="0 0 1 100" aria-hidden="true">
            <path d="M0.5 0 V100" stroke="var(--signal)" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" className="flow-dash" />
          </svg>
          {EARN_STORY.map((s, i) => {
            const last = i === EARN_STORY.length - 1;
            return (
              <li key={s.step} className="relative">
                <span className={cn("absolute top-1 left-[-32px] size-[11px] border border-signal", last ? "bg-signal" : "bg-background")} aria-hidden="true" />
                <p className={cn("font-display text-2xl leading-none font-extrabold uppercase italic", last && "text-signal")}>{s.step}</p>
                <p className="mt-1 text-sm text-foreground/70">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}

/* =============================================================================
 * BUILDTAG DESIGNER
 * ========================================================================== */
export interface DesignerTile {
  id: string;
  name: string;
  decal: DecalImage;
  build: string;
}

const PLACEMENTS = ["Rear quarter windows", "Rear glass", "Motorcycle windscreens", "Tail fairings", "Saddlebags and panniers", "Any clean, flat surface"];

const SIZES = [
  { size: "3 × 3 in", price: "$8.99" },
  { size: "4 × 4 in", price: "$11.99" },
  { size: "5 × 3 in", price: "$11.99" },
  { size: "5 × 5 in", price: "$14.99" },
];

export function DesignerShowcase({ tiles }: { tiles: DesignerTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden")}>
      <div className="carbon absolute inset-y-0 right-0 hidden w-[58%] opacity-60 [mask-image:linear-gradient(to_right,transparent,#000_30%)] lg:block" aria-hidden="true" />
      <Container className={cn("relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center", PAD)}>
        <div>
          <SectionHead
            index="07"
            eyebrow="The physical BuildTag"
            title={
              <>
                <span className="speed-heading">Built to live</span>
                <br />
                <span className="speed-heading chrome-text">on the build.</span>
              </>
            }
            lede="Clean enough to belong on the vehicle. Pick a layout that matches the build, size it for where it's going, and we print, cut and ship it."
          />
          <Mono className="mt-8 block text-signal">Where it goes</Mono>
          <ul className="mt-3 grid grid-cols-2 border-t border-line">
            {PLACEMENTS.map((p) => (
              <li key={p} className="border-b border-line py-2.5 pr-3 font-display text-base font-bold tracking-wide uppercase sm:text-lg">
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-foreground/75">
            Every design is test-scanned before you can order it. BuildTags from {DECAL_FROM}, gloss or matte.
          </p>
          <Link href="/signup" className="btn-signal mt-8" data-event="designer_clicked">
            Design your BuildTag
          </Link>
        </div>

        <div className="reveal">
          <div className="flex items-center justify-between border-b border-foreground/20 pb-3">
            <Mono className="text-foreground/80">Designer / Templates</Mono>
            <Mono className="text-signal">Scan check: passed</Mono>
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 sm:grid-cols-4">
            {tiles.map((t, i) => (
              <li key={t.id} className="flex flex-col items-center">
                <PhysicalTag decal={t.decal} className="w-full max-w-[140px]" />
                <div className="mt-4 text-center">
                  <Mono className="text-signal">{String(i + 1).padStart(2, "0")}</Mono>
                  <p className="mt-1 font-display text-sm font-bold tracking-[0.14em] uppercase">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.build}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-foreground/20 pt-3">
            {SIZES.map((s) => (
              <span key={s.size} className="font-mono text-[11px] tracking-[0.1em] text-foreground/70 uppercase">
                {s.size} <span className="text-signal">{s.price}</span>
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * FOUR WHEELS. TWO WHEELS. Full-bleed split.
 * ========================================================================== */
export function CarsAndBikes({ car, bike }: { car: PublicBuild | null; bike: PublicBuild | null }) {
  const pair = [
    { b: car, label: "Four wheels", photo: car?.photos[1] ?? car?.photos[0] },
    { b: bike, label: "Two wheels", photo: bike?.photos[0] },
  ].filter((p): p is { b: PublicBuild; label: string; photo: PublicBuild["photos"][number] | undefined } => p.b !== null);
  if (pair.length === 0) return null;
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden")}>
      <div className="grid md:grid-cols-2">
        {pair.map(({ b, label, photo }, i) => {
          const src = photo ? photoUrl(photo.storage_path, "full") : b.hero_image_url;
          return (
            <Link key={b.slug} href={`/build/${b.slug}`} className={cn("group relative block overflow-hidden", i === 1 && "md:border-l md:border-foreground/15")} data-event="explore_build_clicked">
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={`${vehicleTitle(b)} "${b.nickname}"`} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:aspect-[5/6] lg:aspect-[4/3.4]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-background/40" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
                <Mono className="text-signal">
                  0{i + 1} / {label}
                </Mono>
                <p className="mt-2 font-display text-5xl leading-none font-extrabold uppercase italic sm:text-6xl xl:text-7xl">{b.nickname}</p>
                <Mono className="mt-3 block text-foreground/75">{[vehicleTitle(b), powerLabel(b.horsepower, b.horsepower_type), `${formatCount(b.mod_count)} mods`].filter(Boolean).join(" · ")}</Mono>
              </div>
            </Link>
          );
        })}
      </div>
      {/* the headline crosses the split */}
      <div className="pointer-events-none relative px-4 py-10 text-center md:absolute md:inset-x-0 md:top-0 md:bg-gradient-to-b md:from-background/85 md:to-transparent md:pt-12 md:pb-24">
        <p className="eyebrow">
          <span className="text-foreground/45">09 / </span>Cars and motorcycles
        </p>
        <h2 className="mt-3 text-4xl leading-[0.95] sm:text-5xl xl:text-6xl">
          <span className="speed-heading">Four wheels.</span> <span className="speed-heading">Two wheels.</span>{" "}
          <span className="speed-heading chrome-text">Same obsession.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/75 sm:text-base">
          Whether it&apos;s a 700 WHP street car or a custom motorcycle, every build deserves somewhere to tell its story.
        </p>
      </div>
    </section>
  );
}

/* =============================================================================
 * CREWS: a roster, not a card
 * ========================================================================== */
const CREW_KINDS = ["Friend groups", "Car clubs", "Motorcycle groups", "Shops", "Dealership communities", "Local scenes"];

export function Crews({ crew }: { crew: Crew | null }) {
  const builds = crew?.builds.slice(0, 3) ?? [];
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden bg-[#080712]")}>
      <Container className={cn("relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end", PAD)}>
        <div>
          <SectionHead
            index="10"
            eyebrow="Crews"
            title={
              <>
                <span className="speed-heading">Don&apos;t just build a vehicle.</span>
                <br />
                <span className="speed-heading chrome-text">Build a crew.</span>
              </>
            }
            lede="Put your builds together under one name. One page for the whole crew, and every member's build links back to it."
          />
          <SlashList items={CREW_KINDS} className="mt-6" />
          <Link href="/crews" className="btn-ghost mt-8" data-event="crew_clicked">
            Explore crews
          </Link>
        </div>

        {crew && builds.length > 0 && (
          <Link href={`/crew/${crew.slug}`} className="reveal group block" data-event="crew_clicked">
            <div className="flex items-end justify-between gap-4 border-b border-foreground/20 pb-4">
              <div>
                <Mono className="text-signal">Crew roster</Mono>
                <p className="mt-2 font-display text-4xl leading-none font-extrabold uppercase italic sm:text-5xl">{crew.name}</p>
                {crew.tagline && <p className="mt-2 text-sm text-muted-foreground">{crew.tagline}</p>}
              </div>
              <Mono className="shrink-0 border border-foreground/25 px-2 py-1">Demo crew</Mono>
            </div>
            <ol className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {builds.map((b, i) => (
                <li key={b.slug} className="relative overflow-hidden">
                  {b.hero_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.hero_image_url.replace("/full.webp", "/thumb.webp")} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                    <Mono className="text-signal">{String(i + 1).padStart(2, "0")}</Mono>
                    <p className="mt-1 truncate font-display text-base leading-none font-bold uppercase sm:text-xl">{b.nickname || b.model}</p>
                    <p className="mt-1 hidden truncate text-[11px] text-foreground/70 sm:block">{vehicleTitle(b)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Link>
        )}
      </Container>
    </section>
  );
}

/* =============================================================================
 * SHOPS: built by the shop, owned by the customer, credit that keeps working
 * ========================================================================== */
const SHOP_FLOW = ["Shop creates the build", "Adds installed parts and mods", "Places the BuildTag", "Transfers the profile to the owner"];

export function Shops({ build }: { build: PublicBuild | null }) {
  const shop = build ? builtByOf(build) : null;
  // Lead with the parts people ask about: exhaust and suspension, then anything else the shop recorded.
  const rank = (c: ModCategory) => (c === "exhaust" ? 0 : c === "suspension" ? 1 : 2);
  const shopMods = [...(build?.modifications.filter((m) => m.source_type !== "owner" && m.recorded_by) ?? [])].sort((a, b) => rank(a.category) - rank(b.category)).slice(0, 2);
  const ownerMods = build?.modifications.filter((m) => m.source_type === "owner").slice(0, 1) ?? [];
  const photo = build?.photos[0] ? photoUrl(build.photos[0].storage_path, "thumb") : (build?.hero_image_url ?? null);
  return (
    <section id="shops" className={cn(SECTION, "cv-auto scroll-mt-16 overflow-hidden")}>
      <div className="carbon absolute inset-0 opacity-50" aria-hidden="true" />
      <Container className={cn("relative grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16", PAD)}>
        <div>
          <SectionHead
            index="11"
            eyebrow="Shops & builders"
            title={
              <>
                <span className="speed-heading">Built by a shop?</span>
                <br />
                <span className="speed-heading chrome-text">Let them document it.</span>
              </>
            }
            lede="Shops can create the build, add installed parts and modifications, place the BuildTag, and transfer the profile to the owner."
          />
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {SHOP_FLOW.map((s, i) => (
              <li key={s} className="flex items-center gap-4 py-2.5 font-display text-base font-bold tracking-wide uppercase sm:text-lg">
                <Mono className="text-signal">0{i + 1}</Mono>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-muted-foreground">The owner takes it from there. The shop stays credited for the work it did.</p>
          <Link href="/business" className="btn-signal mt-8" data-event="business_clicked">
            For shops & builders
          </Link>
        </div>

        {/* An excerpt of a real build sheet */}
        {build && shop && (
          <Link href={`/build/${build.slug}#built-by`} className="reveal group block" data-event="business_clicked">
            <div className="flex items-end gap-4 border-b border-foreground/20 pb-4">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={`${vehicleTitle(build)} "${build.nickname}"`} loading="lazy" decoding="async" className="size-24 shrink-0 object-cover sm:size-28" />
              )}
              <div className="min-w-0">
                <Mono>{vehicleTitle(build)}</Mono>
                <p className="mt-1 font-display text-4xl leading-none font-extrabold uppercase italic">{build.nickname}</p>
                <p className="mt-2 font-display text-sm font-bold tracking-wide uppercase">
                  <span className="text-muted-foreground">Built by </span>
                  {shop.name}
                </p>
                <Mono className="mt-1 block text-foreground/40">Fictional demo shop</Mono>
              </div>
            </div>
            <ul className="divide-y divide-line">
              {[...shopMods, ...ownerMods].map((m) => {
                const isShop = m.source_type !== "owner";
                return (
                  <li key={m.public_id} className="flex flex-col items-start gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0 max-w-full">
                      <p className="truncate text-sm">
                        {m.brand && <span className="text-foreground/60">{m.brand} </span>}
                        {m.part_name}
                      </p>
                      <Mono className="mt-1 block">{MOD_CATEGORY_LABEL[m.category]}</Mono>
                    </div>
                    <Mono className={cn("shrink-0", isShop ? "text-signal" : "text-foreground/50")}>{isShop ? `Shop installed · ${m.recorded_by?.name}` : "Owner added"}</Mono>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line pt-3 text-xs text-muted-foreground">Parts a shop records stay as recorded. The owner can hide them, not rewrite who did the work.</p>
          </Link>
        )}
      </Container>
    </section>
  );
}

/* =============================================================================
 * REAL BUILDS
 * ========================================================================== */
const DISCOVER = [
  { href: "/explore?sort=scanned", label: "Most scanned" },
  { href: "/explore", label: "New builds" },
  { href: "/explore?sort=power", label: "High horsepower" },
];

export function RealBuilds({ builds }: { builds: PublicBuildListRow[] }) {
  if (builds.length === 0) return null;
  return (
    <section className={cn(SECTION, "cv-auto")}>
      <Container className={PAD}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHead
            index="12"
            eyebrow="Explore"
            title={
              <>
                <span className="speed-heading">See what people</span> <span className="speed-heading chrome-text">are building.</span>
              </>
            }
          />
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase">
            {DISCOVER.map((d, i) => (
              <span key={d.label}>
                {i > 0 && <span className="px-2 text-signal">/</span>}
                <Link href={d.href} className="text-foreground/70 underline-offset-4 hover:text-foreground hover:underline" data-event="explore_build_clicked">
                  {d.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
        {/* Phones: a swipeable strip (the next card peeks). sm+: a grid. */}
        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {builds.map((b) => (
            <div key={b.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <BuildCard build={b} />
            </div>
          ))}
        </div>
        <Link href="/explore" className="btn-ghost mt-8" data-event="explore_build_clicked">
          Explore builds
        </Link>
      </Container>
    </section>
  );
}

/* =============================================================================
 * LEADERBOARD PREVIEW: the live top of the scan board
 * ========================================================================== */
export function ScanBoardPreview({ rows }: { rows: BoardBuildRow[] }) {
  const board = BOARDS[0];
  const top = rows.slice(0, 5);
  const leader = top[0]?.scans ?? 0;
  const openPlaces = Array.from({ length: Math.max(0, 3 - top.length) }, (_, i) => top.length + i + 1);
  return (
    <section className={cn(SECTION, "cv-auto bg-[#080712]")}>
      <Container className={cn("grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:gap-16", PAD)}>
        <div>
          <SectionHead
            index="13"
            eyebrow="Leaderboards"
            title={
              <>
                <span className="speed-heading">What&apos;s getting</span>
                <br />
                <span className="speed-heading chrome-text">scanned.</span>
              </>
            }
            lede="Live standings from real scans on public builds. Most scanned, most liked, trending, top builds and top crews."
          />
          <Link href="/leaderboards" className="btn-signal mt-8" data-event="explore_build_clicked">
            View leaderboards <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="reveal">
          <div className="flex items-center justify-between border-b border-foreground/20 pb-3">
            <Mono className="text-foreground/80">Most scanned / All time</Mono>
            <Mono className="text-signal">Live</Mono>
          </div>
          {top.length > 0 && (
            <ol className="divide-y divide-line">
              {top.map((b) => (
                <StandingBuild key={b.slug} b={b} board={board} leader={leader} compact />
              ))}
            </ol>
          )}
          {openPlaces.length > 0 && (
            <ol className={cn("grid gap-4 pt-5", openPlaces.length === 3 ? "sm:grid-cols-3" : openPlaces.length === 2 ? "sm:grid-cols-2" : "")}>
              {openPlaces.map((rank) => (
                <OpenPlace key={rank} rank={rank} />
              ))}
            </ol>
          )}
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * FINAL CTA
 * ========================================================================== */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/home/lineup.webp" alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,5,13,0.92),rgba(6,5,13,0.6),rgba(6,5,13,0.96))]" />
        <div className="grain absolute inset-0 opacity-[0.05]" />
      </div>
      <Container className="relative py-24 text-center md:py-36">
        <h2 className="text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          <span className="speed-heading">Your build already</span>
          <br />
          <span className="speed-heading">gets attention.</span>
        </h2>
        <p className="mt-6 font-display text-2xl font-bold tracking-[0.06em] uppercase sm:text-4xl">
          Give people <span className="text-signal">the details.</span>
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base text-foreground/75 sm:text-lg">Create your BuildTag and let the build speak for itself.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-signal" data-event="signup_started">
            Create your build
          </Link>
          <Link href="/explore" className="btn-ghost" data-event="explore_build_clicked">
            Explore builds
          </Link>
        </div>
        <p className="mt-14">
          <Mono className="text-foreground/60">
            Scan the build. <span className="mx-2 text-signal">·</span> buildtags.app
          </Mono>
        </p>
      </Container>
    </section>
  );
}

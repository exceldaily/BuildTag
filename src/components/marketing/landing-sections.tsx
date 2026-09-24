import Link from "next/link";
import { Car, ExternalLink, KeyRound, Link2, QrCode, ScanLine, Share2, ShieldCheck, Store, Wrench } from "lucide-react";

import type { DecalImage } from "@/lib/landing";
import { photoUrl } from "@/lib/storage";
import { MOD_CATEGORY_LABEL, type Crew, type ModCategory, type PublicBuild, type PublicBuildListRow, type SocialPlatform } from "@/lib/types";
import { cn, formatCount, powerLabel, vehicleTitle } from "@/lib/utils";
import { BuildCard } from "@/components/build/build-card";
import { SocialIcon } from "@/components/build/social-icon";

import { BuildScreen, CameraScreen, Container, Decal, FlowArrow, ModRow, Phone, SectionHead, Tag, Viewfinder } from "./landing-ui";

/** Lowest orderable BuildTag price (3 x 3 in gloss or matte, buildtag.print_specifications). */
export const DECAL_FROM = "$8.99";

const SECTION = "relative border-b border-line";
const PAD = "py-16 md:py-24";

function heroPhoto(b: PublicBuild): { src: string; srcSet?: string } | null {
  const p = b.photos[0];
  if (p) return { src: photoUrl(p.storage_path, "full"), srcSet: `${photoUrl(p.storage_path, "thumb")} 640w, ${photoUrl(p.storage_path, "full")} 2000w` };
  return b.hero_image_url ? { src: b.hero_image_url } : null;
}

/**
 * Oversized abstract module field for the hero backdrop. Deterministic
 * noise with no finder or timing patterns, so it can never scan.
 */
const MODULE_FIELD = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const n = 14;
  let rects = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rnd() > 0.62) rects += `<rect x="${x}" y="${y}" width="0.86" height="0.86" rx="0.12"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" fill="#fff">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

/* =============================================================================
 * 1. HERO: vehicle + BuildTag + phone, in a near-black studio
 * ========================================================================== */
export function Hero({ car, crew, decal }: { car: PublicBuild | null; crew: { name: string; slug: string } | null; decal: DecalImage | null }) {
  const photo = car ? heroPhoto(car) : null;
  return (
    <section className={cn(SECTION, "overflow-hidden bg-[#050409]")}>
      {/* STUDIO: felt more than seen, fading in from left to right. Desktop only. */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block [mask-image:linear-gradient(to_right,transparent_22%,#000_62%)]" aria-hidden="true">
        {/* back wall with a hint of texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_72%_38%,#14111f_0%,#0a0911_55%,transparent_100%)]" />
        <div className="carbon absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_50%_60%_at_72%_40%,#000,transparent_75%)]" />
        {/* overhead linear lights */}
        <div className="absolute top-[7%] left-[52%] h-[70%] w-[30%]">
          <div className="hero-light-bar mx-auto w-[88%] opacity-70" />
          <div className="hero-light-spill absolute inset-x-0 top-0 h-full" />
        </div>
        <div className="absolute top-[12%] left-[76%] h-[62%] w-[22%]">
          <div className="hero-light-bar mx-auto w-[80%] opacity-45" />
          <div className="hero-light-spill absolute inset-x-0 top-0 h-full opacity-80" />
        </div>
        {/* restrained haze */}
        <div className="absolute top-[18%] left-[48%] h-[60%] w-[46%] rounded-full bg-white/[0.022] blur-3xl" />
        {/* BuildTags pink ambient, behind and right of the vehicle */}
        <div className="absolute top-[22%] right-[-6%] h-[70%] w-[42%] rounded-full bg-[radial-gradient(circle,rgba(255,45,122,0.2),transparent_65%)] blur-2xl" />
      </div>
      {/* Phones and tablets: one soft pink light, nothing else. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(ellipse_70%_60%_at_70%_70%,rgba(255,45,122,0.14),transparent_70%)] lg:hidden" aria-hidden="true" />
      {/* Headline protection and a natural vignette. */}
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,#050409_0%,#050409_30%,rgba(5,4,9,0.7)_48%,transparent_68%)] lg:block" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_62%_48%,transparent_55%,rgba(0,0,0,0.7)_100%)]" aria-hidden="true" />

      <Container className="relative grid items-center gap-8 pt-8 pb-12 sm:pt-12 md:gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:pt-14 lg:pb-20 xl:gap-10">
        <div className="max-w-2xl">
          <p className="eyebrow">Scan the build.</p>
          <h1 className="mt-5 text-[3.05rem] leading-[0.88] font-extrabold sm:text-6xl md:text-7xl xl:text-[5.4rem] 2xl:text-[6.2rem]">
            <span className="speed-heading">Your build</span>
            <br />
            <span className="speed-heading">deserves</span>
            <br />
            <span className="speed-heading chrome-text">a spec sheet.</span>
          </h1>
          <p className="mt-6 font-display text-xl font-semibold tracking-[0.06em] uppercase sm:text-2xl">Build it. Tag it. Let anyone scan it.</p>
          <p className="mt-3 max-w-lg text-foreground/75 sm:text-lg">
            Create the digital profile for your car or bike: mods, power, photos, socials and parts, all connected to one permanent BuildTag.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-signal" data-event="hero_create_build_clicked">
              Create your build
            </Link>
            <a href="#scan-demo" className="btn-ghost" data-event="hero_demo_opened">
              Scan a demo
            </a>
          </div>
          <p className="label-tech mt-6">Free to start · Cars and motorcycles · BuildTags from {DECAL_FROM}</p>
        </div>

        {/* REAL CAR -> PHYSICAL TAG -> DIGITAL BUILD, layered back to front. */}
        <div>
          <div className="relative mx-auto aspect-[1/1.02] w-full max-w-[560px] lg:max-w-[720px]">
            {/* abstract module field behind the vehicle only (~3%) */}
            <div
              className="pointer-events-none absolute inset-[-8%] hidden opacity-[0.035] md:block [mask-image:radial-gradient(ellipse_48%_46%_at_42%_44%,#000_30%,transparent_78%)]"
              style={{ backgroundImage: MODULE_FIELD, backgroundSize: "300px 300px" }}
              aria-hidden="true"
            />
            {/* floor plane: horizon line at the car's ground line, a faint lift below */}
            <div className="pointer-events-none absolute top-[63%] right-[-30%] bottom-[-12%] left-[-20%] hidden [mask-image:linear-gradient(to_right,transparent_8%,#000_30%,#000_85%,transparent)] md:block" aria-hidden="true">
              <div className="h-px w-full bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.07)_35%,rgba(255,255,255,0.07)_70%,transparent)]" />
              <div className="h-full w-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.025),transparent_60%)]" />
            </div>

            {/* 1. VEHICLE: the photo dissolves into the studio */}
            <div className="absolute top-0 left-0 h-[88%] w-[82%]">
              {photo && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    srcSet={photo.srcSet}
                    sizes="(min-width: 1024px) 560px, 82vw"
                    alt={car ? `${vehicleTitle(car)} "${car.nickname}" at a night meet` : ""}
                    fetchPriority="high"
                    decoding="async"
                    className="hero-vehicle absolute inset-0 size-full object-cover object-[50%_55%] brightness-[0.93] contrast-[1.05] saturate-[0.82]"
                  />
                  {/* faint wet-floor reflection of the car, mirrored about its ground line */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 1024px) 560px, 82vw" alt="" aria-hidden="true" decoding="async" className="hero-reflection pointer-events-none absolute top-[44%] left-0 hidden h-full w-full object-cover object-[50%_55%] md:block" />
                </>
              )}
              {/* grounding shadow and a whisper of pink bounce light under the car */}
              <div className="pointer-events-none absolute top-[68%] left-[12%] h-[9%] w-[76%] rounded-[50%] bg-black/70 blur-xl" aria-hidden="true" />
              <div className="pointer-events-none absolute top-[71%] left-[24%] h-[8%] w-[60%] rounded-[50%] bg-[rgba(255,45,122,0.16)] blur-2xl" aria-hidden="true" />
              <span className="absolute top-[24%] left-[13%] rounded bg-background/70 px-2 py-1 font-display text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm">The vehicle</span>
            </div>

            {/* pink backlight behind the phone */}
            <div className="pointer-events-none absolute top-[18%] right-[-10%] h-[76%] w-[52%] rounded-full bg-[radial-gradient(circle,rgba(255,45,122,0.26),transparent_68%)] blur-2xl" aria-hidden="true" />

            {/* scan path, tag to phone */}
            <svg className="pointer-events-none absolute inset-0 z-10 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 35 76 C 46 84, 55 67, 66 60" stroke="var(--signal)" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" className="flow-dash" />
            </svg>

            {/* 2. BUILDTAG: on the lower front of the vehicle */}
            {decal && car && (
              <div className="absolute bottom-[9%] left-[6%] z-10 w-[29%] -rotate-3">
                <div className="pointer-events-none absolute inset-[-12%] rounded-full bg-[rgba(255,45,122,0.18)] blur-2xl" aria-hidden="true" />
                <Decal decal={decal} priority className="relative drop-shadow-[0_18px_22px_rgba(0,0,0,0.75)]" />
                <Viewfinder tight tone="signal" />
              </div>
            )}

            {/* 3. PHONE: the digital build, overlapping the car */}
            {car && (
              <Phone glow className="animate-rise absolute right-0 bottom-[3%] z-20 w-[35%] shadow-[0_50px_90px_-30px_rgba(0,0,0,1),0_0_70px_-14px_var(--signal)] [animation-delay:150ms]">
                <BuildScreen build={car} crew={crew} mods={3} eager />
              </Phone>
            )}
          </div>
          <ol className="relative mx-auto mt-5 flex max-w-[620px] items-center justify-center gap-2 font-display text-xs font-bold tracking-[0.2em] uppercase sm:gap-3 sm:text-sm" aria-label="How a scan works">
            <li>Vehicle</li>
            <FlowArrow vertical="never" className="w-8" />
            <li className="text-signal">Scan</li>
            <FlowArrow vertical="never" className="w-8" />
            <li>Digital build</li>
          </ol>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 2. LIVE SCAN DEMO: a real permanent code
 * ========================================================================== */
export function ScanDemo({ car, qr, link }: { car: PublicBuild | null; qr: string; link: string }) {
  const pretty = link.replace(/^https?:\/\//, "");
  const buildHref = car ? `/build/${car.slug}?via=tag` : "/explore";
  return (
    <section id="scan-demo" className={cn(SECTION, "scroll-mt-16 overflow-hidden bg-surface/50")}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_80%_50%,rgba(255,45,122,0.12),transparent_70%)]" aria-hidden="true" />
      <Container className={cn("relative grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-24", PAD)}>
        <div className="max-w-2xl">
          <p className="eyebrow">Live demo</p>
          <h2 className="mt-3 text-4xl leading-[0.95] sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Don&apos;t take our word for it.</span>
            <br />
            <span className="speed-heading chrome-text">Scan this.</span>
          </h2>
          <p className="mt-5 text-base text-foreground/75 sm:text-lg">
            See exactly what someone sees when they scan a BuildTag.
            {car ? ` This is the real, permanent code on ${car.nickname}, a ${[powerLabel(car.horsepower, car.horsepower_type), vehicleTitle(car)].filter(Boolean).join(" ")}.` : ""}
          </p>
          <ol className="mt-6 hidden space-y-2 text-sm text-foreground/80 md:block">
            {["Open your phone's camera. No app needed.", "Point it at the code.", "Tap the link. You're looking at the build."].map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-signal/60 font-display text-xs font-bold text-signal">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={buildHref} className="btn-signal md:hidden" data-event="hero_demo_opened">
              Open demo build
            </Link>
            <Link href={buildHref} className="btn-ghost hidden md:inline-flex" data-event="hero_demo_opened">
              No phone handy? Open it here
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[300px]">
          <div className="relative rounded-2xl bg-white p-4 shadow-[0_0_90px_-24px_var(--signal)] sm:p-5">
            <div role="img" aria-label={`QR code for ${pretty}`} className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <Viewfinder tone="signal" />
          </div>
          <p className="mt-5 text-center">
            <a href={link} className="font-mono text-sm text-foreground/80 underline decoration-signal/60 underline-offset-4 hover:text-foreground" data-event="hero_demo_scanned">
              {pretty}
            </a>
          </p>
          <p className="label-tech mt-1 text-center">Point your camera here</p>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 3. THE TAG. THE SCAN. THE BUILD.
 * ========================================================================== */
export function ProductReveal({ bike, decal, link }: { bike: PublicBuild | null; decal: DecalImage | null; link: string }) {
  if (!bike || !decal) return null;
  const backdrop = bike.photos[0] ? photoUrl(bike.photos[0].storage_path, "thumb") : (bike.hero_image_url ?? "");
  const stages = [
    {
      n: "01",
      title: "The tag.",
      caption: "Printed, cut and shipped to you. Gloss or matte.",
      visual: (
        <div className="carbon relative flex aspect-[9/13] items-center justify-center rounded-3xl border border-line p-[16%]">
          <Decal decal={decal} className="w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)]" />
        </div>
      ),
    },
    {
      n: "02",
      title: "The scan.",
      caption: "Any phone camera. No app to download.",
      visual: (
        <Phone className="mx-auto w-[72%]">
          <CameraScreen decal={decal} backdrop={backdrop} link={link.replace(/^https?:\/\//, "")} />
        </Phone>
      ),
    },
    {
      n: "03",
      title: "The build.",
      caption: "Mods, power, photos, socials and parts. Right there.",
      visual: (
        <Phone glow className="mx-auto w-[72%]">
          <BuildScreen build={bike} mods={4} />
        </Phone>
      ),
    },
  ];
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden")}>
      <Container className={PAD}>
        <SectionHead
          center
          eyebrow="The product"
          title={
            <>
              <span className="speed-heading">The tag.</span> <span className="speed-heading">The scan.</span> <span className="speed-heading chrome-text">The build.</span>
            </>
          }
        />
        <ol className="mt-12 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-4 lg:gap-8">
          {stages.map((s, i) => (
            <li key={s.n} className="contents">
              <div className="reveal mx-auto w-full max-w-[320px]">
                {s.visual}
                <p className="mt-5 text-center font-display text-2xl font-bold uppercase">
                  <span className="mr-2 text-signal">{s.n}</span>
                  {s.title}
                </p>
                <p className="mt-1 text-center text-sm text-muted-foreground">{s.caption}</p>
              </div>
              {i < stages.length - 1 && <FlowArrow className="mx-auto" />}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 4. BUILD IT / TAG IT / SCAN IT / KEEP BUILDING
 * ========================================================================== */
const STEPS = [
  { n: "01", title: "Build it", body: "Create your vehicle profile.", chips: ["Mods", "Photos", "Power", "Parts", "Socials"] },
  { n: "02", title: "Tag it", body: "Design and order your physical BuildTag." },
  { n: "03", title: "Scan it", body: "Anyone can scan your vehicle and explore the build." },
  { n: "04", title: "Keep building", body: "Update the profile anytime. The BuildTag stays the same." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={cn(SECTION, "cv-auto scroll-mt-16 bg-[#080712]")}>
      <div className="grid-fade absolute inset-0" aria-hidden="true" />
      <Container className={cn("relative", PAD)}>
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              <span className="speed-heading">Build it.</span> <span className="speed-heading">Tag it.</span> <span className="speed-heading chrome-text">Scan it.</span>
            </>
          }
        />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="reveal neon-card p-6">
              <span className="font-display text-5xl leading-none font-extrabold text-signal italic">{s.n}</span>
              <h3 className="mt-4 text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground/75">{s.body}</p>
              {s.chips && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.chips.map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="reveal mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-signal/40 bg-signal/[0.07] p-6 sm:p-8 lg:flex-row lg:items-center">
          <p className="font-display text-3xl leading-none font-extrabold uppercase italic sm:text-4xl">
            One permanent tag.
            <br />
            <span className="text-signal">An ever-evolving build.</span>
          </p>
          <p className="max-w-md text-sm text-foreground/80 sm:text-base">
            The QR encodes a permanent code, not a page name. Add mods, swap wheels, rename the build. The tag on the vehicle never needs replacing.
          </p>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 5. THE REAL PRODUCT: a build profile with callouts
 * ========================================================================== */
const LEFT_CALLOUTS = [
  { top: "18%", title: "Hero photo", body: "The shot that stops people." },
  { top: "40%", title: "Year, make, model", body: "Plus the nickname it's known by." },
  { top: "50%", title: "Power and torque", body: "WHP, torque and mod count up top." },
  { top: "61%", title: "Vehicle socials", body: "The car's accounts come first." },
];
const RIGHT_CALLOUTS = [
  { top: "36%", title: "Scanned from a BuildTag", body: "Visitors know they found it on the vehicle." },
  { top: "56%", title: "Owner and crew", body: "Who owns it and who they ride with." },
  { top: "74%", title: "Every modification", body: "Organized by category, with specs." },
  { top: "86%", title: "Part links", body: "Tap through to the exact part." },
];

export function Showcase({ car, crew }: { car: PublicBuild | null; crew: { name: string; slug: string } | null }) {
  if (!car) return null;
  const all = [...LEFT_CALLOUTS, ...RIGHT_CALLOUTS];
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden")}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_35%_50%_at_50%_55%,rgba(255,45,122,0.13),transparent_70%)]" aria-hidden="true" />
      <Container className={cn("relative", PAD)}>
        <SectionHead
          center
          eyebrow="The build page"
          title={
            <>
              <span className="speed-heading">Everything about the build.</span>
              <br />
              <span className="speed-heading chrome-text">One scan away.</span>
            </>
          }
          lede={`This is ${car.nickname}'s real public page, the one its BuildTag opens.`}
        />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_330px_1fr] lg:gap-0 xl:grid-cols-[1fr_360px_1fr]">
          <Callouts items={LEFT_CALLOUTS} side="left" />
          <Link href={`/build/${car.slug}`} className="reveal mx-auto block w-full max-w-[330px] xl:max-w-[360px]" aria-label={`Open ${car.nickname}'s build page`} data-event="explore_build_clicked">
            <Phone glow>
              <BuildScreen build={car} crew={crew} mods={4} />
            </Phone>
          </Link>
          <Callouts items={RIGHT_CALLOUTS} side="right" />
        </div>
        {/* Phones and tablets: the same notes as a list. */}
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:hidden">
          {all.map((c) => (
            <li key={c.title} className="border-l-2 border-signal/60 pl-3">
              <p className="font-display text-sm font-bold tracking-wide uppercase">{c.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function Callouts({ items, side }: { items: { top: string; title: string; body: string }[]; side: "left" | "right" }) {
  return (
    <div className="relative hidden h-full min-h-[640px] lg:block" aria-hidden="true">
      {items.map((c) => (
        <div key={c.title} className={cn("absolute inset-x-0 flex -translate-y-1/2 items-center gap-3", side === "right" && "flex-row-reverse")} style={{ top: c.top }}>
          <div className={cn("w-[46%] shrink-0 xl:w-[42%]", side === "left" ? "text-right" : "text-left")}>
            <p className="font-display text-base font-bold tracking-wide uppercase">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.body}</p>
          </div>
          <span className={cn("h-px flex-1", side === "left" ? "bg-gradient-to-r from-signal/10 to-signal/80" : "bg-gradient-to-l from-signal/10 to-signal/80")} />
          <span className="-mx-1.5 size-2.5 shrink-0 rounded-full bg-signal shadow-[0_0_12px_var(--signal)]" />
        </div>
      ))}
    </div>
  );
}

/* =============================================================================
 * 6. FOUR CORE BENEFITS
 * ========================================================================== */
const SOCIAL_ROW: SocialPlatform[] = ["instagram", "tiktok", "youtube", "facebook", "x", "website"];
const METRICS = ["Scans", "Likes", "Part clicks", "Social clicks", "Affiliate clicks", "Top parts", "Devices", "Countries"];

export function Benefits({ car, bagger }: { car: PublicBuild | null; bagger: PublicBuild | null }) {
  const linked = bagger?.modifications.find((m) => m.has_link && m.category === "exhaust") ?? bagger?.modifications.find((m) => m.has_link) ?? null;
  return (
    <section className={cn(SECTION, "cv-auto bg-[#080712]")}>
      <div className="grid-fade absolute inset-0" aria-hidden="true" />
      <Container className={cn("relative", PAD)}>
        <SectionHead
          eyebrow="What you get"
          title={
            <>
              <span className="speed-heading">Built for people</span>
              <br />
              <span className="speed-heading chrome-text">who actually build.</span>
            </>
          }
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="reveal neon-card flex flex-col p-6">
            <h3 className="text-2xl">Show it off</h3>
            <p className="mt-2 text-sm text-foreground/75">Your complete build in one place. Mods. Power. Photos. Parts. Specs.</p>
            {car && (
              <dl className="mt-auto grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line pt-0">
                {[
                  [car.horsepower ? formatCount(car.horsepower) : null, car.horsepower_type],
                  [car.torque ? formatCount(car.torque) : null, car.horsepower_type === "WHP" ? "WTQ" : "TQ"],
                  [formatCount(car.mod_count), "Mods"],
                ]
                  .filter(([v]) => v)
                  .map(([v, l]) => (
                    <div key={l} className="bg-background px-2 py-3 text-center">
                      <dd className="font-display text-2xl leading-none font-bold tabular-nums">{v}</dd>
                      <dt className="label-tech mt-1">{l}</dt>
                    </div>
                  ))}
              </dl>
            )}
            {car && <p className="label-tech mt-2">{car.nickname} · real build</p>}
          </article>
          <article className="reveal neon-card flex flex-col p-6">
            <h3 className="text-2xl">Grow your following</h3>
            <p className="mt-2 text-sm text-foreground/75">Turn real-world attention into followers. The vehicle&apos;s accounts first, yours second or hidden.</p>
            <ul className="mt-auto flex flex-wrap gap-2 pt-6">
              {SOCIAL_ROW.map((p) => (
                <li key={p} className="flex size-10 items-center justify-center rounded-lg border border-line bg-background" title={p === "x" ? "X" : p[0].toUpperCase() + p.slice(1)}>
                  <SocialIcon platform={p} className="size-4" />
                  <span className="sr-only">{p === "x" ? "X" : p}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="reveal neon-card flex flex-col p-6">
            <h3 className="text-2xl">Make your parts list work</h3>
            <p className="mt-2 text-sm text-foreground/75">
              Someone asks &ldquo;what exhaust is that?&rdquo; They scan and find it. Add product links, including eligible affiliate links, to the parts you actually run.
            </p>
            {linked && (
              <div className="@container mt-auto rounded-lg border border-line bg-background px-3 pt-6">
                <ModRow m={linked} />
              </div>
            )}
          </article>
          <article className="reveal neon-card flex flex-col p-6">
            <h3 className="text-2xl">Know who&apos;s looking</h3>
            <p className="mt-2 text-sm text-foreground/75">See the engagement around your BuildTag, right in your garage.</p>
            <ul className="mt-auto flex flex-wrap gap-1.5 pt-6">
              {METRICS.map((m) => (
                <li key={m}>
                  <Tag tone="cyan">{m}</Tag>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 7 + 8. "WHAT EXHAUST IS THAT?" and part discovery
 * ========================================================================== */
// Positions (percent of the photo) for the DUSK side-profile shot.
const HOTSPOTS: Partial<Record<ModCategory, { x: number; y: number; flip?: boolean }>> = {
  exhaust: { x: 21, y: 63 },
  engine: { x: 49, y: 55 },
  audio: { x: 70, y: 33, flip: true },
  suspension: { x: 71, y: 51 },
  brakes: { x: 75, y: 68, flip: true },
  tires: { x: 86, y: 75, flip: true },
};

export function WhatModIsThat({ bike }: { bike: PublicBuild | null }) {
  if (!bike) return null;
  const photo = bike.photos[0] ? photoUrl(bike.photos[0].storage_path, "full") : bike.hero_image_url;
  const seen = new Set<ModCategory>();
  const spots = bike.modifications
    .filter((m) => HOTSPOTS[m.category] && !seen.has(m.category) && seen.add(m.category))
    .map((m) => ({ m, pos: HOTSPOTS[m.category]! }));
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden")}>
      <Container className={PAD}>
        <div className="text-center">
          <p className="eyebrow">The question every build gets</p>
          <h2 className="mt-4 text-5xl leading-[0.9] font-extrabold italic sm:text-7xl xl:text-8xl">&ldquo;What exhaust is that?&rdquo;</h2>
          <p className="mt-4 font-display text-2xl font-bold tracking-[0.08em] uppercase sm:text-3xl">
            Don&apos;t ask. <span className="text-signal">Scan it.</span>
          </p>
        </div>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_330px] xl:gap-12">
          <figure className="reveal">
            <div className="relative overflow-hidden rounded-2xl border border-line">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={`${vehicleTitle(bike)} "${bike.nickname}" side profile`} loading="lazy" decoding="async" className="aspect-[2000/1321] w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
              {spots.map(({ m, pos }, i) => (
                <div key={m.public_id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                  <span className="hotspot absolute -translate-x-1/2 -translate-y-1/2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-signal font-display text-[10px] font-bold text-white shadow-[0_0_14px_var(--signal)] md:size-3.5 md:text-[0px]">{i + 1}</span>
                  </span>
                  <span
                    className={cn(
                      "absolute hidden -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-background/85 px-2.5 py-1.5 backdrop-blur md:flex",
                      pos.flip ? "right-4" : "left-4",
                    )}
                  >
                    <span className="font-display text-[11px] font-bold tracking-[0.16em] text-signal uppercase">{MOD_CATEGORY_LABEL[m.category]}</span>
                    <span className="text-xs text-foreground/85">{m.brand || m.part_name}</span>
                  </span>
                </div>
              ))}
            </div>
            <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:hidden">
              {spots.map(({ m }, i) => (
                <li key={m.public_id} className="flex gap-2 text-xs">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-signal font-display text-[9px] font-bold text-white">{i + 1}</span>
                  <span>
                    <span className="font-display font-bold tracking-wider uppercase">{MOD_CATEGORY_LABEL[m.category]}</span> <span className="text-muted-foreground">{m.brand || m.part_name}</span>
                  </span>
                </li>
              ))}
            </ol>
            <figcaption className="label-tech mt-3">
              {bike.nickname} · {vehicleTitle(bike)} · real build, real parts list
            </figcaption>
          </figure>
          <Link href={`/build/${bike.slug}#mods`} className="reveal mx-auto block w-full max-w-[300px] xl:max-w-[330px]" aria-label={`See ${bike.nickname}'s parts list`} data-event="explore_build_clicked">
            <Phone glow>
              <BuildScreen build={bike} mods={6} />
            </Phone>
          </Link>
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-foreground/80 sm:text-lg">BuildTags turns curiosity around a vehicle into instant product discovery.</p>

        <PartsFlow />
      </Container>
    </section>
  );
}

const PART_FLOW = [
  { icon: Car, label: "Vehicle" },
  { icon: QrCode, label: "BuildTag" },
  { icon: Wrench, label: "Modification" },
  { icon: ShieldCheck, label: "Product" },
  { icon: ExternalLink, label: "Product link" },
];

function PartsFlow() {
  return (
    <div className="reveal mt-16 rounded-3xl border border-line bg-surface/60 p-6 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <h3 className="text-3xl leading-[0.95] sm:text-4xl">
            <span className="speed-heading">Your build already</span>
            <br />
            <span className="speed-heading chrome-text">influences people.</span>
          </h3>
          <p className="mt-4 text-foreground/80">
            Connect eligible affiliate links to the parts you actually use. When someone scans your BuildTag and checks out a modification, they can follow your product
            link.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Links go through your own programs. BuildTags takes no cut, doesn&apos;t guarantee earnings and adds a disclosure to build pages with affiliate links.
          </p>
        </div>
        <ol className="flex flex-col items-center gap-2 md:flex-row md:justify-between">
          {PART_FLOW.map((s, i) => (
            <li key={s.label} className="contents">
              <div className="flex w-full flex-row items-center gap-3 rounded-xl border border-line bg-background px-4 py-3 md:w-auto md:flex-col md:px-3 md:py-4">
                <s.icon className="size-5 text-signal" aria-hidden="true" />
                <span className="font-display text-xs font-bold tracking-[0.14em] uppercase">{s.label}</span>
              </div>
              {i < PART_FLOW.length - 1 && <FlowArrow className="w-6 md:w-8" />}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* =============================================================================
 * 9. BUILDTAG DESIGNER
 * ========================================================================== */
export interface DesignerTile {
  id: string;
  name: string;
  decal: DecalImage;
  build: string;
}

const SIZES = [
  { size: "3 × 3 in", price: "$8.99" },
  { size: "4 × 4 in", price: "$11.99" },
  { size: "5 × 3 in", price: "$11.99" },
  { size: "5 × 5 in", price: "$14.99" },
];

export function DesignerShowcase({ tiles }: { tiles: DesignerTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden bg-[#080712]")}>
      <div className="grid-fade absolute inset-0" aria-hidden="true" />
      <Container className={cn("relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center", PAD)}>
        <div>
          <SectionHead
            eyebrow="The BuildTag designer"
            title={
              <>
                <span className="speed-heading">Make the tag</span>
                <br />
                <span className="speed-heading chrome-text">match the build.</span>
              </>
            }
          />
          <ol className="mt-8 space-y-3">
            {["Choose the layout", "Choose the style", "Choose the size", "Preview it", "Order it"].map((s, i) => (
              <li key={s} className="flex items-center gap-3 font-display text-lg font-bold tracking-wide uppercase">
                <span className="flex size-7 items-center justify-center rounded-full border border-signal/60 text-sm text-signal">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-foreground/75">
            Every design is test-scanned before you can order it. BuildTags from {DECAL_FROM}, gloss or matte, printed and shipped to you.
          </p>
          <Link href="/signup" className="btn-signal mt-8" data-event="designer_clicked">
            Design your BuildTag
          </Link>
        </div>

        <div className="reveal overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm font-bold tracking-[0.16em] uppercase">Designer · Templates</p>
            <Tag tone="signal">Scan check: passed</Tag>
          </div>
          <ul className="carbon grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.id} className="flex flex-col items-center gap-3 bg-[#0a0911]/90 p-4 sm:p-5">
                <Decal decal={t.decal} className="w-full max-w-[150px]" />
                <div className="text-center">
                  <p className="font-display text-sm font-bold tracking-[0.14em] uppercase">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.build}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            {SIZES.map((s) => (
              <span key={s.size} className="rounded-md border border-line px-2.5 py-1 text-xs">
                <span className="font-display font-bold">{s.size}</span> <span className="text-muted-foreground">{s.price}</span>
              </span>
            ))}
            <span className="ml-auto rounded-md bg-signal px-3 py-1.5 font-display text-xs font-bold tracking-[0.14em] text-white uppercase">Approve &amp; order</span>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 10. FOUR WHEELS. TWO WHEELS.
 * ========================================================================== */
export function CarsAndBikes({ car, bike }: { car: PublicBuild | null; bike: PublicBuild | null }) {
  const pair = [
    { b: car, label: "Four wheels", photo: car?.photos[1] ?? car?.photos[0] },
    { b: bike, label: "Two wheels", photo: bike?.photos[0] },
  ].filter((p): p is { b: PublicBuild; label: string; photo: PublicBuild["photos"][number] | undefined } => p.b !== null);
  if (pair.length === 0) return null;
  return (
    <section className={cn(SECTION, "cv-auto")}>
      <Container className={PAD}>
        <SectionHead
          center
          title={
            <>
              <span className="speed-heading">Four wheels.</span> <span className="speed-heading">Two wheels.</span>
              <br />
              <span className="speed-heading chrome-text">Same obsession.</span>
            </>
          }
          lede="Whether it's a 700 WHP street car or a custom motorcycle, every build deserves somewhere to tell its story."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {pair.map(({ b, label, photo }) => {
            const src = photo ? photoUrl(photo.storage_path, "full") : b.hero_image_url;
            return (
              <Link key={b.slug} href={`/build/${b.slug}`} className="group reveal neon-card relative block overflow-hidden" data-event="explore_build_clicked">
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={`${vehicleTitle(b)} "${b.nickname}"`} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <p className="eyebrow">{label}</p>
                  <p className="mt-1 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">{b.nickname}</p>
                  <p className="mt-1 font-display text-sm tracking-[0.12em] text-foreground/80 uppercase">
                    {[vehicleTitle(b), powerLabel(b.horsepower, b.horsepower_type), `${formatCount(b.mod_count)} mods`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 11. CREWS
 * ========================================================================== */
const CREW_KINDS = ["Friend groups", "Car clubs", "Motorcycle groups", "Shops", "Dealership communities", "Local scenes"];

export function Crews({ crew }: { crew: Crew | null }) {
  const builds = crew?.builds.slice(0, 3) ?? [];
  return (
    <section className={cn(SECTION, "cv-auto overflow-hidden bg-[#080712]")}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_55%_at_75%_50%,rgba(31,216,255,0.08),transparent_70%)]" aria-hidden="true" />
      <Container className={cn("relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center", PAD)}>
        <div>
          <SectionHead
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
          <ul className="mt-6 flex flex-wrap gap-2">
            {CREW_KINDS.map((k) => (
              <li key={k} className="rounded-full border border-line px-3 py-1 text-sm text-foreground/85">
                {k}
              </li>
            ))}
          </ul>
          <Link href="/crews" className="btn-ghost mt-8" data-event="crew_clicked">
            Explore crews
          </Link>
        </div>

        {crew && builds.length > 0 && (
          <Link href={`/crew/${crew.slug}`} className="reveal block overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-foreground/30" data-event="crew_clicked">
            <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 font-display text-2xl font-extrabold text-neon-cyan uppercase" aria-hidden="true">
                  {crew.name.slice(0, 1)}
                </span>
                <div>
                  <p className="label-tech">Crew</p>
                  <p className="font-display text-2xl leading-none font-extrabold uppercase sm:text-3xl">{crew.name}</p>
                  {crew.tagline && <p className="mt-1 text-sm text-muted-foreground">{crew.tagline}</p>}
                </div>
              </div>
              <Tag tone="cyan">Demo crew</Tag>
            </div>
            <div className="p-5 sm:p-6">
              <p className="label-tech">Featured builds</p>
              <ul className="mt-3 grid grid-cols-3 gap-3">
                {builds.map((b) => (
                  <li key={b.slug} className="overflow-hidden rounded-lg border border-line bg-background">
                    {b.hero_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.hero_image_url.replace("/full.webp", "/thumb.webp")} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
                    )}
                    <div className="p-2 sm:p-3">
                      <p className="truncate font-display text-base leading-none font-bold uppercase sm:text-lg">{b.nickname || b.model}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{vehicleTitle(b)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Link>
        )}
      </Container>
    </section>
  );
}

/* =============================================================================
 * 12 + 14 + 16. SHOP BUILDS IT, CUSTOMER OWNS IT (attribution + claiming)
 * ========================================================================== */
const SHOP_FLOW = ["Shop or dealer", "Creates the build", "Documents installed mods", "Installs the BuildTag", "Customer takes delivery", "Customer claims the build", "Customer keeps building"];
const CLAIM_FLOW = [
  { icon: Wrench, text: "Shop builds it" },
  { icon: KeyRound, text: "Customer scans the private claim card" },
  { icon: ShieldCheck, text: "Claim your build" },
  { icon: Car, text: "Build appears in the customer's garage" },
  { icon: Share2, text: "Customer continues the story" },
];

export function Shops({ build }: { build: PublicBuild | null }) {
  const shop = build?.contributors.find((c) => c.organization && c.roles.some((r) => r === "creator" || r === "builder" || r === "dealer"))?.organization ?? null;
  // Lead with the parts people ask about: exhaust and suspension, then anything else the shop recorded.
  const rank = (c: ModCategory) => (c === "exhaust" ? 0 : c === "suspension" ? 1 : 2);
  const shopMods = [...(build?.modifications.filter((m) => m.source_type !== "owner" && m.recorded_by) ?? [])].sort((a, b) => rank(a.category) - rank(b.category)).slice(0, 2);
  const ownerMods = build?.modifications.filter((m) => m.source_type === "owner").slice(0, 1) ?? [];
  const photo = build?.photos[0] ? photoUrl(build.photos[0].storage_path, "thumb") : (build?.hero_image_url ?? null);
  return (
    <section id="shops" className={cn(SECTION, "cv-auto scroll-mt-16 overflow-hidden")}>
      <div className="carbon absolute inset-0 opacity-80" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_10%,rgba(255,45,122,0.12),transparent_70%)]" aria-hidden="true" />
      <Container className={cn("relative", PAD)}>
        <SectionHead
          eyebrow="BuildTags for shops & dealers"
          title={
            <>
              <span className="speed-heading">Built by the shop.</span>
              <br />
              <span className="speed-heading chrome-text">Owned by the customer.</span>
            </>
          }
          lede="A shop can create the entire digital build before the customer even has an account. When the vehicle is delivered, the customer securely claims it. The shop stays credited for the work it did."
        />

        <ol className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-7 lg:gap-0">
          {SHOP_FLOW.map((s, i) => (
            <li key={s} className="reveal relative flex items-center gap-3 rounded-xl border border-line bg-background/80 px-4 py-3 lg:flex-col lg:items-start lg:rounded-none lg:border-y lg:border-r-0 lg:border-l lg:px-4 lg:py-5 lg:first:rounded-l-xl lg:last:rounded-r-xl lg:last:border-r">
              <span className="font-display text-xl leading-none font-extrabold text-signal italic">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-sm font-bold tracking-wide uppercase lg:mt-2">{s}</span>
            </li>
          ))}
        </ol>

        <p className="reveal mt-12 max-w-4xl font-display text-3xl leading-[0.95] font-extrabold uppercase italic sm:text-5xl">
          The customer takes ownership.
          <br />
          <span className="text-signal">The shop keeps the credit.</span>
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Attribution on a real build page */}
          {build && shop && (
            <Link href={`/build/${build.slug}#built-by`} className="reveal block overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-foreground/30" data-event="business_clicked">
              <div className="flex gap-4 border-b border-line p-5">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={`${vehicleTitle(build)} "${build.nickname}"`} loading="lazy" decoding="async" className="size-24 shrink-0 rounded-lg object-cover sm:size-28" />
                )}
                <div className="min-w-0">
                  <p className="label-tech">{vehicleTitle(build)}</p>
                  <p className="font-display text-3xl leading-none font-extrabold uppercase">{build.nickname}</p>
                  <p className="mt-3 label-tech">Built by</p>
                  <p className="font-display text-lg leading-none font-bold uppercase">{shop.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Fictional demo shop</p>
                </div>
              </div>
              <ul className="divide-y divide-line">
                {[...shopMods, ...ownerMods].map((m) => {
                  const isShop = m.source_type !== "owner";
                  return (
                    <li key={m.public_id} className="flex flex-col items-start gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0 max-w-full">
                        <p className="truncate text-sm font-medium">
                          {m.brand && <span className="text-foreground/65">{m.brand} </span>}
                          {m.part_name}
                        </p>
                        <p className="label-tech mt-0.5">{MOD_CATEGORY_LABEL[m.category]}</p>
                      </div>
                      {isShop ? <Tag tone="signal" className="shrink-0">Shop installed · {m.recorded_by?.name}</Tag> : <Tag className="shrink-0">Owner added</Tag>}
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-line px-5 py-3 text-xs text-muted-foreground">
                Parts a shop records stay as recorded. The owner can hide them, not rewrite who did the work.
              </p>
            </Link>
          )}

          {/* Claiming */}
          <div className="reveal rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <p className="font-display text-xl font-bold uppercase">How claiming works</p>
            <ol className="mt-4 space-y-3">
              {CLAIM_FLOW.map((s, i) => (
                <li key={s.text} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-background">
                    <s.icon className="size-4 text-signal" aria-hidden="true" />
                  </span>
                  <span className="text-sm">
                    <span className="mr-2 font-display font-bold text-muted-foreground">{i + 1}</span>
                    {s.text}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-background p-4">
                <QrCode className="size-5 text-foreground" aria-hidden="true" />
                <p className="mt-2 font-display text-base font-bold uppercase">Public BuildTag</p>
                <p className="mt-1 text-xs text-muted-foreground">On the vehicle. Anyone can scan it to see the build. It never transfers ownership.</p>
              </div>
              <div className="rounded-xl border border-signal/40 bg-signal/[0.07] p-4">
                <KeyRound className="size-5 text-signal" aria-hidden="true" />
                <p className="mt-2 font-display text-base font-bold uppercase">Private claim card</p>
                <p className="mt-1 text-xs text-muted-foreground">Handed to the owner. A single-use ownership credential that stops working once it&apos;s used.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/business" className="btn-signal" data-event="business_clicked">
            BuildTags for shops
          </Link>
          <Link href="/business/contact?interest=customer_buildtags" className="btn-ghost" data-event="business_clicked">
            Talk to us
          </Link>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 15. SHOP PORTFOLIO VALUE
 * ========================================================================== */
const PORTFOLIO_TRAIL = [
  { icon: ScanLine, label: "Scan" },
  { icon: Store, label: "View shop" },
  { icon: Car, label: "View other builds" },
  { icon: Link2, label: "Website, socials, crew" },
];

export function ShopPortfolio() {
  return (
    <section className={cn(SECTION, "cv-auto bg-[#080712]")}>
      <Container className={cn("grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center", PAD)}>
        <div>
          <SectionHead
            eyebrow="For dealers & shops"
            title={
              <>
                <span className="speed-heading">Every build that leaves your shop</span>
                <br />
                <span className="speed-heading chrome-text">can keep promoting your work.</span>
              </>
            }
          />
          <ol className="mt-8 flex flex-wrap items-center gap-2">
            {PORTFOLIO_TRAIL.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 font-display text-xs font-bold tracking-[0.12em] uppercase">
                  <s.icon className="size-4 text-signal" aria-hidden="true" />
                  {s.label}
                </span>
                {i < PORTFOLIO_TRAIL.length - 1 && <FlowArrow vertical="never" className="w-6" />}
              </li>
            ))}
          </ol>
          <Link href="/business" className="btn-ghost mt-8" data-event="business_clicked">
            For dealers &amp; shops
          </Link>
        </div>

        {/* Schematic: one shop, many customer builds, each carrying the credit. */}
        <div className="reveal relative mx-auto w-full max-w-[560px]" aria-hidden="true">
          <svg viewBox="0 0 100 64" className="absolute inset-0 size-full" preserveAspectRatio="none">
            {[12, 32, 52].map((y) => (
              <path key={y} d={`M 30 32 C 45 32, 50 ${y}, 62 ${y}`} stroke="var(--signal)" strokeOpacity="0.7" strokeWidth="1.2" fill="none" vectorEffect="non-scaling-stroke" className="flow-dash" />
            ))}
          </svg>
          <div className="relative grid aspect-[100/64] grid-cols-[30%_1fr_38%] items-center">
            <div className="flex flex-col items-center rounded-2xl border border-signal/50 bg-surface p-4 text-center shadow-[0_0_40px_-16px_var(--signal)]">
              <Store className="size-7 text-signal" />
              <p className="mt-2 font-display text-sm font-bold uppercase">Your shop</p>
            </div>
            <span />
            <div className="flex h-full flex-col justify-between py-[2%]">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border border-line bg-surface px-3 py-2">
                  <p className="font-display text-xs font-bold uppercase">Customer build</p>
                  <p className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <QrCode className="size-3" /> BuildTag
                    </span>
                    · <span>Build profile</span> · <span className="text-signal">Built by</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* =============================================================================
 * 17. REAL BUILDS
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
            eyebrow="Explore"
            title={
              <>
                <span className="speed-heading">See what people</span> <span className="speed-heading chrome-text">are building.</span>
              </>
            }
          />
          <ul className="flex flex-wrap gap-2">
            {DISCOVER.map((d) => (
              <li key={d.label}>
                <Link href={d.href} className="inline-flex rounded-full border border-line px-3 py-1.5 font-display text-xs font-bold tracking-[0.14em] uppercase hover:border-foreground/40" data-event="explore_build_clicked">
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {builds.map((b) => (
            <BuildCard key={b.slug} build={b} />
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
 * 21. FINAL CTA
 * ========================================================================== */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/home/lineup.webp" alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,5,13,0.92),rgba(6,5,13,0.6),rgba(6,5,13,0.96))]" />
      </div>
      <Container className="relative py-24 text-center md:py-36">
        <h2 className="text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          <span className="speed-heading">Your build already</span>
          <br />
          <span className="speed-heading">gets attention.</span>
        </h2>
        <p className="mt-6 font-display text-2xl font-bold tracking-[0.06em] uppercase sm:text-4xl">
          Give people <span className="text-signal">something to scan.</span>
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-signal" data-event="signup_started">
            Create your build
          </Link>
          <Link href="/explore" className="btn-ghost" data-event="explore_build_clicked">
            Explore builds
          </Link>
        </div>
        <p className="mt-14 font-display text-sm font-bold tracking-[0.3em] text-foreground/70 uppercase">
          Scan the build. <span className="mx-2 text-signal">·</span> buildtags.app
        </p>
      </Container>
    </section>
  );
}


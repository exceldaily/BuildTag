import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { DecalImage } from "@/lib/landing";
import type { PublicBuild } from "@/lib/types";
import { cn, formatCount, vehicleTitle } from "@/lib/utils";

import { HeroDepth } from "./hero-depth";
import { BuildScreen, FlowArrow, Phone } from "./landing-ui";

/** Transparent cutout of the GHOST demo Supra (scripts/make-hero-cutout.mjs). */
const CUTOUT = { src: "/images/home/ghost-cutout.webp", small: "/images/home/ghost-cutout-800.webp", w: 1400, h: 849 };

/** Oversized abstract module field: noise with no finder or timing patterns, so it cannot scan. */
const MODULE_FIELD = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const n = 14;
  let rects = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rnd() > 0.62) rects += `<rect x="${x}" y="${y}" width="0.86" height="0.86" rx="0.12"/>`;
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" fill="#fff">${rects}</svg>`)}")`;
})();

/** Depth-plane helper: `d` is pointer travel in px, `ds` a scroll factor. */
function depth(d: number, ds = 0): React.CSSProperties {
  return { "--d": `${d}px`, "--ds": ds } as React.CSSProperties;
}

function Mono({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("font-mono text-[10px] leading-none tracking-[0.14em] text-foreground/55 uppercase", className)}>{children}</span>;
}

/* =============================================================================
 * HERO: an automotive poster. Planes, back to front:
 * studio, GHOST type, vehicle, BuildTag, phone, annotations.
 * ========================================================================== */
export function Hero({ car, crew, decal }: { car: PublicBuild | null; crew: { name: string; slug: string } | null; decal: DecalImage | null }) {
  const nickname = car?.nickname || "GHOST";
  const title = car ? vehicleTitle(car) : "";
  const specs = car ? [car.horsepower ? `${formatCount(car.horsepower)} ${car.horsepower_type}` : null, car.torque ? `${formatCount(car.torque)} ${car.horsepower_type === "WHP" ? "WTQ" : "TQ"}` : null, `${formatCount(car.mod_count)} MODS`].filter(Boolean) : [];

  return (
    <section id="hero" className="relative z-10 overflow-x-clip bg-[#050409]">
      <HeroDepth targetId="hero" />

      {/* ---------- BACK PLANE: studio, texture, technical grid ---------- */}
      <div className="depth pointer-events-none absolute inset-0" style={depth(1.5)} aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_70%_42%,#15121f_0%,#0a0911_52%,transparent_100%)]" />
        <div className="eng-paper absolute inset-0 [mask-image:radial-gradient(ellipse_48%_58%_at_70%_46%,#000_20%,transparent_80%)]" />
        <div
          className="absolute inset-0 hidden opacity-[0.03] lg:block [mask-image:radial-gradient(ellipse_40%_45%_at_68%_40%,#000_30%,transparent_80%)]"
          style={{ backgroundImage: MODULE_FIELD, backgroundSize: "320px 320px", backgroundPosition: "60vw 4vw" }}
        />
        <div className="absolute top-[5%] left-[50%] hidden h-[65%] w-[34%] lg:block">
          <div className="hero-light-bar mx-auto w-[86%] opacity-50" />
          <div className="hero-light-spill absolute inset-x-0 top-0 h-full" />
        </div>
        {/* the one light source: pink, from behind and right of the car */}
        <div className="absolute top-[10%] right-[-8%] h-[80%] w-[46%] rounded-full bg-[radial-gradient(circle,rgba(255,45,122,0.16),transparent_62%)] blur-2xl" />
      </div>
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden="true" />

      {/* ---------- MID-BACK PLANE: giant nickname behind the car ---------- */}
      <div className="depth pointer-events-none absolute inset-x-0 top-[3%] hidden lg:block" style={depth(2.5, -0.05)} aria-hidden="true">
        <p className="ghost-type hero-fade absolute left-[33vw] text-[min(25vw,440px)] text-white/[0.05]">{nickname}</p>
      </div>

      {/* Headline protection: the left stays clean. */}
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,#050409_0%,#050409_26%,rgba(5,4,9,0.75)_38%,transparent_52%)] lg:block" aria-hidden="true" />

      <div className="relative lg:h-[clamp(640px,56vw,900px)]">
        {/* ---------- COPY ---------- */}
        <div className="relative z-30 px-4 pt-8 sm:px-6 lg:absolute lg:top-1/2 lg:left-[max(2.5rem,4vw)] lg:w-[min(40vw,640px)] lg:-translate-y-1/2 lg:px-0 lg:pt-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Mono className="text-signal">Build profile / 001</Mono>
            <Mono>BT // Digital vehicle identity</Mono>
          </p>
          <h1 className="mt-5 text-[3.05rem] leading-[0.86] font-extrabold sm:text-6xl md:text-7xl lg:text-[clamp(3.6rem,5.9vw,6.4rem)]">
            <span className="speed-heading">Your build</span>
            <br />
            <span className="speed-heading">deserves</span>
            <br />
            <span className="speed-heading chrome-text">a spec sheet.</span>
          </h1>
          <p className="mt-6 font-display text-xl font-semibold tracking-[0.06em] uppercase sm:text-2xl">Build it. Tag it. Let anyone scan it.</p>
          <p className="mt-3 max-w-lg text-foreground/75 sm:text-lg lg:max-w-[min(36vw,32rem)]">
            Create the digital profile for your car or bike: mods, power, photos, socials and parts, all connected to one permanent BuildTag.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-hero" data-event="hero_create_build_clicked">
              Create your build
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <a href="#scan-demo" className="btn-hero-ghost" data-event="hero_demo_opened">
              Scan a demo
            </a>
          </div>
          <p className="label-tech mt-6 lg:max-w-[28vw]">Free to start · Cars and motorcycles · BuildTags from $8.99</p>
        </div>

        {/* ---------- THE SCENE (all positions relative to the car) ---------- */}
        {car && (
          <div className="relative mt-[26vw] mb-[34vw] ml-[2vw] w-[110vw] sm:mt-[16vw] sm:mb-[22vw] sm:ml-[9vw] sm:w-[86vw] lg:absolute lg:bottom-[19%] lg:left-[40vw] lg:m-0 lg:w-[min(64vw,980px)]" style={{ aspectRatio: `${CUTOUT.w} / ${CUTOUT.h}` }}>
            {/* phones and tablets: the nickname sits behind the car here */}
            <p className="ghost-type pointer-events-none absolute top-[-40%] left-[-2%] text-[34vw] text-white/[0.05] sm:top-[-30%] sm:text-[26vw] lg:hidden" aria-hidden="true">
              {nickname}
            </p>
            {/* grounding shadow (large, soft) and faint wet-floor reflection */}
            <div className="depth absolute inset-0" style={depth(4)} aria-hidden="true">
              <div className="absolute top-[88%] left-[-4%] h-[16%] w-[108%] rounded-[50%] bg-black/80 blur-2xl" />
              <div className="absolute top-[93%] left-[6%] h-[7%] w-[88%] rounded-[50%] bg-black blur-md" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CUTOUT.src} alt="" className="car-reflection absolute top-full left-0 hidden w-full opacity-60 md:block" loading="lazy" decoding="async" />
            </div>

            {/* VEHICLE */}
            <div className="depth absolute inset-0" style={depth(4)}>
              <div className="hero-in absolute inset-0" style={{ "--delay": "0ms" } as React.CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CUTOUT.src}
                  srcSet={`${CUTOUT.small} 800w, ${CUTOUT.src} 1400w`}
                  sizes="(min-width: 1024px) 64vw, 110vw"
                  width={CUTOUT.w}
                  height={CUTOUT.h}
                  alt={`${title} "${nickname}", the demo build`}
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 size-full"
                />
                <div className="car-rim absolute inset-0" aria-hidden="true" />
              </div>
            </div>

            {/* ANNOTATIONS: hairlines, crosshairs, ticks. Real data only. */}
            <div className="depth pointer-events-none absolute inset-0 z-30" style={depth(8)} aria-hidden="true">
              {/* dimension line over the roof */}
              <span className="hero-grow-x absolute top-[-9%] left-[6%] h-px w-[88%] origin-left bg-foreground/45" style={{ "--delay": "250ms" } as React.CSSProperties} />
              {[6, 28, 50, 72, 94].map((x, i) => (
                <span
                  key={x}
                  className={cn("hero-fade absolute w-px -translate-x-1/2 bg-foreground/45", i === 0 || i === 4 ? "top-[calc(-9%-6px)] h-3" : "top-[calc(-9%-3px)] h-1.5")}
                  style={{ left: `${x}%`, "--delay": "450ms" } as React.CSSProperties}
                />
              ))}
              <div className="hero-fade absolute top-[-13%] left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap" style={{ "--delay": "450ms" } as React.CSSProperties}>
                <Mono className="text-foreground/70">
                  Build: <span className="text-foreground">{nickname}</span>
                  <span className="sm:hidden"> · {[car.year, car.model].filter(Boolean).join(" ")}</span>
                  <span className="hidden sm:inline">
                    {" "}
                    · {title}
                    {car.trim ? ` ${car.trim}` : ""}
                  </span>
                </Mono>
              </div>

              {/* 01 power: hood -> spec block */}
              <svg className="hero-fade absolute inset-0 hidden size-full overflow-visible lg:block" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ "--delay": "420ms" } as React.CSSProperties}>
                <path d="M 60 27 L 70 9" stroke="rgba(243,241,255,0.45)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="hero-grow-x absolute top-[9%] left-[70%] hidden h-px w-[4.5%] origin-left bg-foreground/45 lg:block" style={{ "--delay": "560ms" } as React.CSSProperties} />
              <Crosshair x={60} y={27} className="hidden lg:block" delay={420} />
              <p className="absolute top-[31%] left-[61.5%] hidden lg:block">
                <Mono className="text-[9px] text-foreground/35">X.60 / Y.27</Mono>
              </p>
              {specs.length > 0 && (
                <div className="hero-fade absolute top-[9%] left-[75.5%] hidden -translate-y-[0.6em] lg:block" style={{ "--delay": "600ms" } as React.CSSProperties}>
                  <Mono className="block text-signal">01 · Power</Mono>
                  <dl className="mt-2 space-y-1 font-display text-[clamp(0.85rem,1.15vw,1.15rem)] leading-none font-bold tracking-[0.06em] whitespace-nowrap uppercase">
                    {specs.map((sp) => (
                      <dd key={sp}>{sp}</dd>
                    ))}
                  </dl>
                </div>
              )}

              {/* 02 tag leader: bumper -> label (pink: it's the product) */}
              <span className="hero-grow-y absolute top-[86%] left-[40%] hidden h-[15%] w-px origin-top bg-signal lg:block" style={{ "--delay": "520ms" } as React.CSSProperties} />
              <span className="hero-grow-x absolute top-[101%] left-[18.5%] hidden h-px w-[21.5%] origin-right bg-signal lg:block" style={{ "--delay": "640ms" } as React.CSSProperties} />
              <Crosshair x={40} y={86} tone="signal" delay={520} className="hidden lg:block" />
            </div>

            {/* SCAN PATH: starts behind the tag, runs along the floor, ends at the phone */}
            <svg className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 12 104 C 22 124, 48 122, 63.5 100" stroke="var(--signal)" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" className="flow-dash hero-fade hidden lg:inline" style={{ "--delay": "700ms" } as React.CSSProperties} />
              <path d="M 14 112 C 24 134, 48 134, 60 124" stroke="var(--signal)" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" className="flow-dash hero-fade lg:hidden" style={{ "--delay": "700ms" } as React.CSSProperties} />
            </svg>

            {/* PHYSICAL BUILDTAG */}
            {decal && (
              <div className="depth absolute top-[84%] left-[-1%] z-20 w-[19%] lg:top-[82%] lg:w-[17%]" style={depth(6)}>
                <div className="hero-in" style={{ "--delay": "380ms" } as React.CSSProperties}>
                  <div className="tag-physical relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={decal.src} width={decal.width} height={decal.height} alt={decal.label} decoding="async" className="block h-auto w-full" />
                    <div className="tag-sheen pointer-events-none absolute inset-0" style={{ WebkitMaskImage: `url("${decal.src}")`, maskImage: `url("${decal.src}")` }} aria-hidden="true" />
                  </div>
                </div>
                <div className="hero-fade absolute top-[22%] left-[112%] w-max lg:top-[38%]" style={{ "--delay": "620ms" } as React.CSSProperties}>
                  <Mono className="block text-signal">02 · Physical BuildTag</Mono>
                  {car.qr_code && <Mono className="mt-1.5 block text-foreground/60">BT ID · {car.qr_code}</Mono>}
                </div>
              </div>
            )}

            {/* PHONE: the digital build, forward of the car */}
            <div className="depth absolute top-[46%] left-[60%] z-20 w-[27%] sm:w-[22%] lg:top-[36%] lg:left-[calc(56vw-clamp(170px,15vw,250px))] lg:w-[clamp(170px,15vw,250px)]" style={depth(7, -0.03)}>
              <div className="hero-in" style={{ "--delay": "780ms" } as React.CSSProperties}>
                {/* pink backlight, same source as the car's rim light */}
                <div className="pointer-events-none absolute top-[10%] right-[-35%] h-[80%] w-[90%] rounded-full bg-[rgba(255,45,122,0.22)] blur-3xl" aria-hidden="true" />
                <Phone className="shadow-[inset_-1px_0_0_rgba(255,45,122,0.6),0_50px_70px_-28px_rgba(0,0,0,1),0_16px_28px_-12px_rgba(0,0,0,0.85)]">
                  <BuildScreen build={car} crew={crew} mods={3} eager />
                </Phone>
              </div>
            </div>
          </div>
        )}

        {/* VEHICLE -> SCAN -> DIGITAL BUILD */}
        <ol
          className="relative z-30 flex items-center justify-center gap-2 px-4 pb-10 font-display text-xs font-bold tracking-[0.2em] uppercase sm:gap-3 sm:text-sm lg:absolute lg:bottom-[4%] lg:left-[max(2.5rem,4vw)] lg:justify-start lg:p-0"
          aria-label="How a scan works"
        >
          <li>Vehicle</li>
          <FlowArrow vertical="never" className="w-8" />
          <li className="text-signal">Scan</li>
          <FlowArrow vertical="never" className="w-8" />
          <li>Digital build</li>
        </ol>
      </div>

      {/* ---------- FOREGROUND: a cropped viewfinder corner ---------- */}
      <div className="depth pointer-events-none absolute top-[3%] right-[-3vw] hidden size-[16vw] blur-[0.6px] lg:block" style={depth(9)} aria-hidden="true">
        <span className="absolute top-0 right-0 h-full w-full rounded-tr-[2vw] border-t-2 border-r-2 border-signal/35" />
      </div>

      {/* ---------- TRANSITION: a technical line that runs into the live demo ---------- */}
      <div className="pointer-events-none absolute top-[58%] right-[1.3vw] hidden h-[calc(42%+14rem)] flex-col items-center gap-4 lg:flex" aria-hidden="true">
        <Mono className="[writing-mode:vertical-rl] text-foreground/45">Scan the build.</Mono>
        <span className="w-px flex-1 bg-[linear-gradient(to_bottom,rgba(255,45,122,0.7),rgba(255,45,122,0.25))]" />
        <span className="h-px w-5 -translate-x-2.5 bg-signal/70" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_bottom,transparent,rgba(10,8,19,0.9))]" aria-hidden="true" />
    </section>
  );
}

function Crosshair({ x, y, tone = "light", className, delay = 0 }: { x: number; y: number; tone?: "light" | "signal"; className?: string; delay?: number }) {
  const c = tone === "signal" ? "border-signal" : "border-foreground/60";
  const l = tone === "signal" ? "bg-signal" : "bg-foreground/60";
  return (
    <span className={cn("hero-fade absolute size-3 -translate-x-1/2 -translate-y-1/2", className)} style={{ left: `${x}%`, top: `${y}%`, "--delay": `${delay}ms` } as React.CSSProperties}>
      <span className={cn("absolute inset-0 rounded-full border", c)} />
      <span className={cn("absolute top-1/2 -left-1.5 h-px w-6 -translate-y-1/2", l)} />
      <span className={cn("absolute -top-1.5 left-1/2 h-6 w-px -translate-x-1/2", l)} />
    </span>
  );
}

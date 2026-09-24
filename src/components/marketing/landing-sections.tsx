import Link from "next/link";
import { ArrowUpRight, KeyRound, QrCode } from "lucide-react";

import type { DecalImage } from "@/lib/landing";
import { photoUrl } from "@/lib/storage";
import { MOD_CATEGORY_LABEL, type Crew, type ModCategory, type PublicBuild, type PublicBuildListRow, type SocialPlatform } from "@/lib/types";
import { cn, formatCount, powerLabel, vehicleTitle } from "@/lib/utils";
import { BuildCard } from "@/components/build/build-card";
import { SocialIcon } from "@/components/build/social-icon";

import { BuildScreen, CameraScreen, Container, Mono, Phone, PhysicalTag, SectionHead, Viewfinder } from "./landing-ui";

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
 * LIVE SCAN DEMO: a real permanent code (continues the hero's line)
 * ========================================================================== */
export function ScanDemo({ car, qr, link }: { car: PublicBuild | null; qr: string; link: string }) {
  const pretty = link.replace(/^https?:\/\//, "");
  const buildHref = car ? `/build/${car.slug}?via=tag` : "/explore";
  return (
    <section id="scan-demo" className={cn(SECTION, "scroll-mt-16 overflow-hidden bg-[#0a0813]")}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_36%_55%_at_82%_50%,rgba(255,45,122,0.09),transparent_70%)]" aria-hidden="true" />
      <Container className={cn("relative grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-24", PAD)}>
        <div className="max-w-2xl">
          <p className="eyebrow">
            <span className="text-foreground/45">02 / </span>Live demo
          </p>
          <h2 className="mt-3 text-4xl leading-[0.95] sm:text-5xl xl:text-6xl">
            <span className="speed-heading">Don&apos;t take our word for it.</span>
            <br />
            <span className="speed-heading chrome-text">Scan this.</span>
          </h2>
          <p className="mt-5 text-base text-foreground/75 sm:text-lg">
            See exactly what someone sees when they scan a BuildTag.
            {car ? ` This is the real, permanent code on ${car.nickname}, a ${[powerLabel(car.horsepower, car.horsepower_type), vehicleTitle(car)].filter(Boolean).join(" ")}.` : ""}
          </p>
          <ol className="mt-7 hidden divide-y divide-line border-y border-line md:block">
            {["Open your phone's camera. No app needed.", "Point it at the code.", "Tap the link. You're looking at the build."].map((s, i) => (
              <li key={s} className="flex items-center gap-4 py-2.5 text-sm text-foreground/80">
                <Mono className="text-signal">0{i + 1}</Mono>
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
          <PhysicalTag decal={decal} tilt className="w-[72%]" />
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
          index="03"
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
            <Mono className="mt-2 text-signal">04</Mono>
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
    <section className={cn(SECTION, "cv-auto overflow-hidden bg-[#080712]")}>
      <p className="ghost-type pointer-events-none absolute top-[18%] left-1/2 hidden -translate-x-1/2 text-[18vw] text-white/[0.03] lg:block" aria-hidden="true">
        {car.nickname}
      </p>
      <Container className={cn("relative", PAD)}>
        <SectionHead
          center
          index="04"
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
              <Mono className="text-foreground/40">{car.nickname} · real build</Mono>
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
      body: "Someone asks “what exhaust is that?” They scan and find it. Add product links, including eligible affiliate links, to the parts you actually run.",
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
          index="05"
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
 * "WHAT EXHAUST IS THAT?" and part discovery (the benchmark section)
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
    <section className={cn(SECTION, "cv-auto overflow-hidden bg-[#080712]")}>
      <Container className={PAD}>
        <div className="text-center">
          <p className="eyebrow">
            <span className="text-foreground/45">06 / </span>The question every build gets
          </p>
          <h2 className="mt-4 text-5xl leading-[0.9] font-extrabold italic sm:text-7xl xl:text-8xl">&ldquo;What exhaust is that?&rdquo;</h2>
          <p className="mt-4 font-display text-2xl font-bold tracking-[0.08em] uppercase sm:text-3xl">
            Don&apos;t ask. <span className="text-signal">Scan it.</span>
          </p>
        </div>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_330px] xl:gap-12">
          <figure className="reveal">
            <div className="relative overflow-hidden rounded-sm border border-line">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={`${vehicleTitle(bike)} "${bike.nickname}" side profile`} loading="lazy" decoding="async" className="aspect-[2000/1321] w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
              {spots.map(({ m, pos }, i) => (
                <div key={m.public_id} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                  <span className="hotspot absolute -translate-x-1/2 -translate-y-1/2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-signal font-display text-[10px] font-bold text-white md:size-3.5 md:text-[0px]">{i + 1}</span>
                  </span>
                  <span
                    className={cn(
                      "absolute hidden -translate-y-1/2 items-center gap-2 border-l-2 border-signal bg-background/85 px-2.5 py-1.5 whitespace-nowrap backdrop-blur md:flex",
                      pos.flip ? "right-4" : "left-4",
                    )}
                  >
                    <span className="font-mono text-[10px] tracking-[0.16em] text-signal uppercase">{MOD_CATEGORY_LABEL[m.category]}</span>
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
            <figcaption className="mt-3">
              <Mono>
                {bike.nickname} · {vehicleTitle(bike)} · real build, real parts list
              </Mono>
            </figcaption>
          </figure>
          <Link href={`/build/${bike.slug}#mods`} className="reveal mx-auto block w-full max-w-[300px] xl:max-w-[330px]" aria-label={`See ${bike.nickname}'s parts list`} data-event="explore_build_clicked">
            <Phone className="shadow-[inset_-1px_0_0_rgba(255,45,122,0.5),0_50px_80px_-30px_rgba(0,0,0,1)]">
              <BuildScreen build={bike} mods={6} />
            </Phone>
          </Link>
        </div>

        <PartsFlow />
      </Container>
    </section>
  );
}

const PART_FLOW = ["Vehicle", "BuildTag", "Modification", "Product", "Product link"];

function PartsFlow() {
  return (
    <div className="reveal mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
      <div>
        <h3 className="text-3xl leading-[0.95] sm:text-4xl">
          <span className="speed-heading">Your build already</span>
          <br />
          <span className="speed-heading chrome-text">influences people.</span>
        </h3>
        <p className="mt-4 max-w-lg text-foreground/80">
          BuildTags turns curiosity around a vehicle into instant product discovery. Connect eligible affiliate links to the parts you actually use, and a scan
          can follow through to your product link.
        </p>
        <p className="mt-3 max-w-lg text-xs text-muted-foreground">
          Links go through your own programs. BuildTags takes no cut, doesn&apos;t guarantee earnings and adds a disclosure to build pages with affiliate links.
        </p>
      </div>
      {/* one technical line, five stations */}
      <ol className="relative flex flex-col gap-6 pl-6 md:flex-row md:justify-between md:gap-0 md:pl-0" aria-label="From vehicle to product link">
        <span className="absolute top-0 bottom-0 left-[5px] w-px bg-signal/50 md:top-[5px] md:right-0 md:bottom-auto md:left-0 md:h-px md:w-auto" aria-hidden="true" />
        {PART_FLOW.map((s, i) => (
          <li key={s} className="relative flex items-center gap-3 md:flex-col md:items-start md:gap-3">
            <span className="absolute left-[-24px] size-[11px] border border-signal bg-background md:static" aria-hidden="true" />
            <span>
              <Mono className="block text-signal">0{i + 1}</Mono>
              <span className="mt-1 block font-display text-sm font-bold tracking-[0.1em] uppercase">{s}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
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
            eyebrow="The BuildTag designer"
            title={
              <>
                <span className="speed-heading">Make the tag</span>
                <br />
                <span className="speed-heading chrome-text">match the build.</span>
              </>
            }
          />
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {["Choose the layout", "Choose the style", "Choose the size", "Preview it", "Order it"].map((s, i) => (
              <li key={s} className="flex items-center gap-4 py-2.5 font-display text-lg font-bold tracking-wide uppercase">
                <Mono className="text-signal">0{i + 1}</Mono>
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
          <span className="text-foreground/45">08 / </span>Cars and motorcycles
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
            index="09"
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
const SHOP_FLOW = ["Shop or dealer", "Creates the build", "Documents installed mods", "Installs the BuildTag", "Customer takes delivery", "Customer claims the build", "Customer keeps building"];
const CLAIM_FLOW = ["Shop builds it", "Customer scans the private claim card", "Claim your build", "Build appears in the customer's garage", "Customer continues the story"];
const PORTFOLIO_TRAIL = ["Scan", "View shop", "View other builds", "Website, socials, crew"];

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
      <Container className={cn("relative", PAD)}>
        <SectionHead
          index="10"
          eyebrow="For shops & dealers"
          title={
            <>
              <span className="speed-heading">Built by the shop.</span>
              <br />
              <span className="speed-heading chrome-text">Owned by the customer.</span>
            </>
          }
          lede="A shop can create the entire digital build before the customer even has an account. When the vehicle is delivered, the customer securely claims it. The shop stays credited for the work it did."
        />

        {/* the handoff, as one line */}
        <ol className="relative mt-12 grid gap-5 pl-6 lg:grid-cols-7 lg:gap-4 lg:pl-0">
          <span className="absolute top-0 bottom-0 left-[5px] w-px bg-signal/50 lg:top-[5px] lg:right-0 lg:bottom-auto lg:left-0 lg:h-px lg:w-auto" aria-hidden="true" />
          {SHOP_FLOW.map((s, i) => (
            <li key={s} className="relative">
              <span className="absolute top-[1px] left-[-24px] size-[11px] border border-signal bg-background lg:static lg:block" aria-hidden="true" />
              <Mono className="block text-signal lg:mt-4">{String(i + 1).padStart(2, "0")}</Mono>
              <p className="mt-1.5 font-display text-sm font-bold tracking-wide uppercase">{s}</p>
            </li>
          ))}
        </ol>

        <p className="reveal mt-16 max-w-4xl font-display text-3xl leading-[0.95] font-extrabold uppercase italic sm:text-5xl">
          The customer takes ownership.
          <br />
          <span className="text-signal">The shop keeps the credit.</span>
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
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

          {/* Claiming */}
          <div className="reveal">
            <div className="border-b border-foreground/20 pb-4">
              <Mono className="text-signal">How claiming works</Mono>
            </div>
            <ol className="divide-y divide-line">
              {CLAIM_FLOW.map((s, i) => (
                <li key={s} className="flex items-center gap-4 py-3 text-sm">
                  <Mono className="text-signal">0{i + 1}</Mono>
                  {s}
                </li>
              ))}
            </ol>
            <div className="mt-6 grid gap-6 border-t border-foreground/20 pt-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-line">
              <div className="sm:pr-6">
                <QrCode className="size-5" aria-hidden="true" />
                <p className="mt-2 font-display text-base font-bold uppercase">Public BuildTag</p>
                <p className="mt-1 text-xs text-muted-foreground">On the vehicle. Anyone can scan it to see the build. It never transfers ownership.</p>
              </div>
              <div className="sm:pl-6">
                <KeyRound className="size-5 text-signal" aria-hidden="true" />
                <p className="mt-2 font-display text-base font-bold uppercase">Private claim card</p>
                <p className="mt-1 text-xs text-muted-foreground">Handed to the owner. A single-use ownership credential that stops working once it&apos;s used.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio value, in one line */}
        <div className="reveal mt-16 grid gap-6 border-t border-foreground/20 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-display text-2xl leading-tight font-bold uppercase sm:text-3xl">Every build that leaves your shop can keep promoting your work.</p>
            <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-foreground/70 uppercase">
              {PORTFOLIO_TRAIL.map((s, i) => (
                <span key={s}>
                  {i > 0 && <span className="px-2 text-signal">→</span>}
                  {s}
                </span>
              ))}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/business" className="btn-signal" data-event="business_clicked">
              BuildTags for shops
            </Link>
            <Link href="/business/contact?interest=customer_buildtags" className="btn-ghost" data-event="business_clicked">
              Talk to us
            </Link>
          </div>
        </div>
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
            index="11"
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
        <p className="mt-14">
          <Mono className="text-foreground/60">
            Scan the build. <span className="mx-2 text-signal">·</span> buildtags.app
          </Mono>
        </p>
      </Container>
    </section>
  );
}

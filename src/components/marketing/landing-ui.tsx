import { ArrowUpRight } from "lucide-react";

import type { DecalImage } from "@/lib/landing";
import { photoUrl } from "@/lib/storage";
import { MOD_CATEGORY_LABEL, type PublicBuild, type PublicModification } from "@/lib/types";
import { cn, formatCount, vehicleTitle } from "@/lib/utils";
import { LogoMark } from "@/components/layout/logo";
import { SocialIcon } from "@/components/build/social-icon";

/* ---------------------------------------------------------------------------
 * Shared building blocks for the landing page. Server components only.
 * ------------------------------------------------------------------------- */

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10 2xl:px-14", className)}>{children}</div>;
}

/** Section title: small eyebrow, big italic headline, optional short lede. */
export function SectionHead({ eyebrow, title, lede, center = false, className }: { eyebrow?: string; title: React.ReactNode; lede?: React.ReactNode; center?: boolean; className?: string }) {
  return (
    <div className={cn(center && "mx-auto text-center", "max-w-3xl", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-3 text-4xl leading-[0.95] sm:text-5xl xl:text-6xl">{title}</h2>
      {lede && <p className={cn("mt-4 text-base text-foreground/75 sm:text-lg", center && "mx-auto max-w-2xl")}>{lede}</p>}
    </div>
  );
}

/** A real decal image (path-only SVG from the decal route), sized by its container. */
export function Decal({ decal, className, priority = false }: { decal: DecalImage; className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={decal.src}
      width={decal.width}
      height={decal.height}
      alt={decal.label}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("block h-auto w-full", className)}
    />
  );
}

/** Phone mockup. Children render inside a size container, so screens can use cqw units. */
export function Phone({ className, children, glow = false }: { className?: string; children: React.ReactNode; glow?: boolean }) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19] rounded-[14%/6.6%] border border-white/15 bg-[#050409] p-[3%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95)]",
        glow && "shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95),0_0_60px_-18px_var(--signal)]",
        className,
      )}
    >
      <div className="@container relative h-full overflow-hidden rounded-[11%/5.2%] bg-background">
        <div className="absolute top-[1.6%] left-1/2 z-30 h-[3.2%] w-[30%] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function buildHero(b: PublicBuild, variant: "thumb" | "full" = "thumb"): string | null {
  if (b.photos[0]) return photoUrl(b.photos[0].storage_path, variant);
  return b.hero_image_url;
}

/** One part row as the build page shows it. */
export function ModRow({ m, compact = false }: { m: PublicModification; compact?: boolean }) {
  const business = m.source_type !== "owner" && m.source_type !== "import";
  return (
    <div className={cn("flex items-center justify-between gap-[3cqw] border-b border-line/70 last:border-b-0", compact ? "py-[2.6cqw]" : "py-[3.2cqw]")}>
      <div className="min-w-0">
        <p className="truncate text-[4.1cqw] leading-tight font-medium">
          {m.brand && <span className="text-foreground/65">{m.brand} </span>}
          {m.part_name}
        </p>
        <p className="mt-[0.8cqw] flex items-center gap-[1.5cqw] font-display text-[2.9cqw] tracking-[0.12em] text-muted-foreground uppercase">
          {MOD_CATEGORY_LABEL[m.category]}
          {business && m.recorded_by && <span className="text-signal">· Shop installed</span>}
        </p>
      </div>
      {m.has_link && (
        <span className="inline-flex shrink-0 items-center gap-[0.8cqw] rounded-[1.4cqw] border border-line px-[2cqw] py-[1.2cqw] font-display text-[2.8cqw] font-bold tracking-[0.1em] uppercase">
          View part
          <ArrowUpRight className="size-[3cqw]" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

/**
 * The scanned build page, miniaturized: same hierarchy and data as the real
 * public page (hero, title, nickname, stats, chips, socials, parts).
 */
export function BuildScreen({ build: b, crew = null, mods = 4, gallery = false, viaTag = true, eager = false }: { build: PublicBuild; crew?: { name: string } | null; mods?: number; gallery?: boolean; viaTag?: boolean; eager?: boolean }) {
  const hero = buildHero(b);
  const builtBy = b.contributors.find((c) => c.organization && c.roles.some((r) => r === "creator" || r === "builder" || r === "dealer"))?.organization ?? null;
  const shown = b.modifications.slice(0, mods);
  // Same stats as the build page; unknown values are left out instead of shown as dashes.
  const stats: [string, string][] = [
    ...(b.horsepower ? [[formatCount(b.horsepower), b.horsepower_type] as [string, string]] : []),
    ...(b.torque ? [[formatCount(b.torque), b.horsepower_type === "WHP" ? "WTQ" : "TQ"] as [string, string]] : []),
    [formatCount(b.mod_count), "Mods"],
  ];
  return (
    <div className="flex h-full flex-col text-left">
      <div className="relative aspect-[10/9] shrink-0 overflow-hidden bg-surface-2">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" loading={eager ? "eager" : "lazy"} decoding="async" className="size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/10" />
        <div className="absolute top-[7%] left-[5cqw] flex items-center gap-[1.5cqw]">
          <LogoMark className="size-[5cqw]" />
          <span className="font-display text-[3cqw] font-bold tracking-[0.18em] uppercase">BuildTags</span>
        </div>
      </div>
      <div className="relative -mt-[16cqw] flex min-h-0 flex-1 flex-col px-[5cqw] pb-[4cqw]">
        <p className="font-display text-[2.8cqw] font-semibold tracking-[0.2em] text-signal uppercase">{viaTag ? "Scanned from a BuildTag" : "Build sheet"}</p>
        <p className="mt-[1cqw] truncate font-display text-[3.8cqw] font-semibold tracking-[0.06em] text-foreground/80 uppercase">
          {vehicleTitle(b)}
          {b.trim ? <span className="text-muted-foreground"> {b.trim}</span> : null}
        </p>
        {b.nickname && <p className="font-display text-[13cqw] leading-[0.9] font-bold uppercase">{b.nickname}</p>}
        <div className={cn("mt-[3cqw] grid gap-px overflow-hidden rounded-[2cqw] border border-line bg-line", stats.length === 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {stats.map(([v, l]) => (
            <div key={l} className="bg-background px-[1cqw] py-[2.6cqw] text-center">
              <p className="font-display text-[6.4cqw] leading-none font-bold tabular-nums">{v}</p>
              <p className="mt-[1cqw] font-display text-[2.6cqw] tracking-[0.16em] text-muted-foreground uppercase">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-[2.6cqw] flex flex-wrap items-center gap-[1.6cqw]">
          {b.owner && <span className="font-display text-[2.8cqw] tracking-[0.14em] text-muted-foreground uppercase">@{b.owner.username}</span>}
          {builtBy && <span className="font-display text-[2.8cqw] tracking-[0.14em] text-muted-foreground uppercase">· Built by {builtBy.name}</span>}
          {crew && (
            <span className="rounded-full border border-neon-cyan/50 bg-neon-cyan/10 px-[2cqw] py-[0.6cqw] font-display text-[2.5cqw] font-bold tracking-[0.12em] text-neon-cyan uppercase">Crew · {crew.name}</span>
          )}
        </div>
        {b.vehicle_socials.length > 0 && (
          <div className="mt-[2.6cqw] flex flex-wrap gap-[1.6cqw]">
            {b.vehicle_socials.slice(0, 3).map((s) => (
              <span key={s.public_id} className="inline-flex items-center gap-[1.2cqw] rounded-[1.4cqw] border border-line px-[2cqw] py-[1.2cqw] text-[3cqw]">
                <SocialIcon platform={s.platform} className="size-[3.4cqw]" />@{s.handle}
              </span>
            ))}
          </div>
        )}
        {shown.length > 0 && (
          <div className="mt-[3cqw]">
            <p className="font-display text-[4.4cqw] font-bold uppercase">Modifications</p>
            <div className="mt-[1cqw]">
              {shown.map((m) => (
                <ModRow key={m.public_id} m={m} compact />
              ))}
            </div>
          </div>
        )}
        {gallery && b.photos.length > 1 && (
          <div className="mt-[3cqw] grid grid-cols-3 gap-[1.5cqw]">
            {b.photos.slice(0, 3).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.storage_path} src={photoUrl(p.storage_path, "thumb")} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-[1.4cqw] object-cover" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Phone camera pointed at a decal: viewfinder, scan beam and the link toast. */
export function CameraScreen({ decal, backdrop, link }: { decal: DecalImage; backdrop: string; link: string }) {
  return (
    <div className="relative h-full overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={backdrop} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-[2px]" />
      <div className="absolute inset-0 bg-black/35" />
      {/* link toast, like the camera app shows it */}
      <div className="absolute top-[9%] left-1/2 z-20 flex w-[84%] -translate-x-1/2 items-center gap-[2.4cqw] rounded-[3.5cqw] bg-white/90 px-[3cqw] py-[2.4cqw] text-black shadow-lg">
        <LogoMark className="size-[6cqw] shrink-0 text-black" />
        <div className="min-w-0">
          <p className="text-[3cqw] font-semibold">Open in browser</p>
          <p className="truncate text-[3cqw] text-black/60">{link}</p>
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2 w-[64%] -translate-x-1/2 -translate-y-[40%]">
        <div className="relative">
          <Decal decal={decal} className="drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]" />
          <Viewfinder />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[5%] flex justify-center">
        <span className="size-[15cqw] rounded-full border-[1.2cqw] border-white/90 bg-white/20" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Corner brackets and a moving scan beam over whatever sits inside. */
export function Viewfinder({ tight = false, tone = "white" }: { tight?: boolean; tone?: "white" | "signal" }) {
  const pos = tight ? "-inset-[5%]" : "-inset-[9%]";
  const c = tone === "white" ? "border-white" : "border-signal";
  return (
    <div className={cn("pointer-events-none absolute", pos)} aria-hidden="true">
      <span className={`absolute top-0 left-0 h-[18%] w-[18%] rounded-tl-[14%] border-t-[3px] border-l-[3px] ${c}`} />
      <span className={`absolute top-0 right-0 h-[18%] w-[18%] rounded-tr-[14%] border-t-[3px] border-r-[3px] ${c}`} />
      <span className={`absolute bottom-0 left-0 h-[18%] w-[18%] rounded-bl-[14%] border-b-[3px] border-l-[3px] ${c}`} />
      <span className={`absolute right-0 bottom-0 h-[18%] w-[18%] rounded-br-[14%] border-r-[3px] border-b-[3px] ${c}`} />
      <div className="absolute inset-[6%] overflow-hidden">
        <span className="scan-beam" />
      </div>
    </div>
  );
}

/** Arrow between flow steps: right on wide screens, down on phones. */
export function FlowArrow({ className, vertical = "md" }: { className?: string; vertical?: "md" | "lg" | "never" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center text-signal",
        vertical === "md" && "rotate-90 md:rotate-0",
        vertical === "lg" && "rotate-90 lg:rotate-0",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 12" className="h-3 w-10">
        <path d="M0 6 H34" stroke="currentColor" strokeWidth="1.5" className="flow-dash" />
        <path d="M31 1 L38 6 L31 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </span>
  );
}

/** Small uppercase tag used for badges on cards. */
export function Tag({ children, tone = "line", className }: { children: React.ReactNode; tone?: "line" | "signal" | "cyan"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] uppercase",
        tone === "line" && "border-line text-muted-foreground",
        tone === "signal" && "border-signal/50 bg-signal/10 text-signal",
        tone === "cyan" && "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan",
        className,
      )}
    >
      {children}
    </span>
  );
}

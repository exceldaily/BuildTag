import Link from "next/link";

import { LogoMark } from "@/components/layout/logo";

/* ---------------------------------------------------------------------------
 * Ticker: the neon marquee strip between hero and content.
 * ------------------------------------------------------------------------- */
const TICKER = ["Scan the build", "What's done to it?", "Get paid for your parts list", "One permanent QR", "Print-ready decals", "Vehicle socials", "Part links"];

export function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative overflow-hidden border-y border-line bg-[#080712]" aria-hidden="true">
      <div className="flex w-max animate-[ticker_28s_linear_infinite] whitespace-nowrap py-3">
        {items.map((t, i) => (
          <span key={i} className={`mx-6 font-display text-sm font-bold tracking-[0.22em] uppercase ${i % 3 === 0 ? "text-signal" : i % 3 === 1 ? "text-foreground/80" : "text-neon-cyan"}`}>
            {t} <span className="mx-4 text-muted-foreground">{"//"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Show BuildTag: real car photo + real decal artwork + phone with the build.
 * ------------------------------------------------------------------------- */
export function ShowBuildTag({ decalSvg }: { decalSvg: string }) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
      <div className="neon-card relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/home/garage-86.webp" alt="White Toyota 86 parked inside a garage" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,5,13,0.85),transparent_55%)]" />
        {/* the decal, as the designer renders it */}
        <div className="absolute bottom-4 left-4 w-[34%] max-w-[200px] drop-shadow-[0_0_24px_rgba(255,45,122,0.55)] sm:bottom-6 sm:left-6" dangerouslySetInnerHTML={{ __html: decalSvg }} />
        <div className="absolute right-4 bottom-4 max-w-[46%] text-right sm:right-6 sm:bottom-6">
          <p className="label-tech text-neon-cyan">Physical BuildTag</p>
          <p className="mt-1 font-display text-xl leading-none font-bold uppercase sm:text-2xl">On the car. On every car.</p>
        </div>
      </div>

      <div>
        <p className="eyebrow">Show BuildTag</p>
        <h2 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
          <span className="speed-heading">Sticker on the quarter panel.</span>
          <br />
          <span className="speed-heading chrome-text">Whole build on their phone.</span>
        </h2>
        <p className="mt-5 text-foreground/80">
          The decal is real artwork you print: vector QR, safe quiet zone, automotive styling around it. Someone scans it
          in a parking lot and lands on the build sheet in about a second, even on cellular.
        </p>
        <div className="mt-6">
          <PhoneMock />
        </div>
      </div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="flex items-end gap-4">
      <div className="w-[150px] shrink-0 rounded-[20px] border border-neon-cyan/40 bg-[#06050d] p-1.5 shadow-[0_0_34px_-8px_var(--neon-cyan)] sm:w-[170px]">
        <div className="overflow-hidden rounded-[15px] bg-[#0d0b18]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/demo/ghost-1/thumb.webp" alt="" className="h-24 w-full object-cover" loading="lazy" />
          <div className="space-y-1.5 p-2.5">
            <p className="font-display text-[8px] font-semibold tracking-[0.18em] text-signal uppercase">2022 Toyota GR Supra</p>
            <p className="font-display text-[18px] leading-none font-bold uppercase">Ghost</p>
            <div className="grid grid-cols-3 gap-1 pt-1">
              {[
                ["540", "WHP"],
                ["520", "WTQ"],
                ["24", "MODS"],
              ].map(([v, l]) => (
                <div key={l} className="rounded bg-[#06050d] px-1 py-1 text-center">
                  <p className="font-display text-[12px] leading-none font-bold text-neon-cyan">{v}</p>
                  <p className="text-[6px] tracking-[0.15em] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-1">
              {["Pure800 Turbo", "KW V3 Coilovers", "Volk TE37 SAGA"].map((m) => (
                <div key={m} className="flex items-center gap-1">
                  <span className="size-1 rounded-full bg-signal" />
                  <span className="text-[7px] text-foreground/80">{m}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 rounded bg-signal py-1 text-center font-display text-[7px] font-bold tracking-[0.2em] text-white uppercase">View part</div>
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-foreground/80">
        <li className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-signal" /> Power, torque, mod count up top
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-neon-cyan" /> Vehicle socials before owner socials
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-neon-amber" /> Every part, with a link
        </li>
        <li className="pt-2">
          <Link href="/build/ghost-2022-toyota-gr-supra" className="btn-ghost btn-small">
            Open the demo build
          </Link>
        </li>
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Pricing
 * ------------------------------------------------------------------------- */
export function Pricing() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="neon-card p-6 sm:p-8">
        <p className="label-tech">Free</p>
        <p className="mt-2 font-display text-5xl font-extrabold uppercase">
          $0 <span className="text-lg text-muted-foreground">forever</span>
        </p>
        <ul className="mt-6 space-y-2 text-sm text-foreground/85">
          {["1 vehicle", "12 photos", "Unlimited modifications and part links", "Vehicle and owner socials", "Permanent BuildTag QR", "Standard decal templates, SVG and PNG export", "Scan and click analytics"].map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neon-cyan" />
              {f}
            </li>
          ))}
        </ul>
        <Link href="/signup" className="btn-signal mt-8 w-full">
          Create your build
        </Link>
      </div>
      <div className="neon-card border-signal/50 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="label-tech text-signal">Pro</p>
          <span className="rounded border border-neon-cyan/60 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.2em] text-neon-cyan uppercase">2 months free yearly</span>
        </div>
        <p className="mt-2 font-display text-5xl font-extrabold uppercase">
          $5 <span className="text-lg text-muted-foreground">a month</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or <span className="font-display text-xl font-bold text-foreground">$50</span> a year
        </p>
        <ul className="mt-6 space-y-2 text-sm text-foreground/85">
          {["Up to 10 vehicles", "60 photos per vehicle", "25 saved decal designs", "Start a crew and add members", "Pro badge on your build page", "Priority support"].map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-signal" />
              {f}
            </li>
          ))}
        </ul>
        <Link href="/signup?plan=pro" className="btn-ghost mt-8 w-full border-signal/60">
          Go Pro
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout by Stripe. Cancel any time.</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * FAQ
 * ------------------------------------------------------------------------- */
const FAQ = [
  {
    q: "How do I make money from my build?",
    a: "Join any affiliate program (Amazon Associates and eBay Partner Network approve most people in a day, and most big aftermarket shops run programs through Impact, ShareASale or CJ). Paste the tracking link on each part. When someone scans your car and taps View part, the click goes through your link and the program pays you the commission. BuildTag adds the required disclosure to your page and keeps nothing.",
  },
  {
    q: "What happens if I rename my build or change my username?",
    a: "Nothing, for the decal. The QR encodes a permanent short code, not a URL with your name in it. Scans always resolve to wherever your build lives now.",
  },
  {
    q: "Where do I print the decal?",
    a: "Download the SVG (vector) or a 300 DPI PNG from the Designer and send it to any sticker or decal printer. The outer shape is the cut line. Test-scan the printed decal before you apply it.",
  },
  {
    q: "Can I hide my personal accounts and only show the car's?",
    a: "Yes. Vehicle socials and owner socials are separate. You can hide the whole owner section per vehicle, or hide individual links.",
  },
  {
    q: "Does anyone need an account to view my build?",
    a: "No. Public and unlisted builds open for anyone who scans or has the link. Likes work without an account too.",
  },
  {
    q: "What if I sell the car?",
    a: "Set the build to private or transfer it later. The decal keeps pointing at the same code, so you stay in control of what it shows.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-lg border border-line">
      {FAQ.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="font-display text-lg font-bold uppercase">{item.q}</span>
            <span className="font-display text-2xl text-signal transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="px-5 pb-5 text-sm text-foreground/80">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Small brand chip used in photo overlays
 * ------------------------------------------------------------------------- */
export function BrandChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded bg-background/80 px-2 py-1">
      <LogoMark className="size-4" />
      <span className="font-display text-[11px] font-bold tracking-[0.2em] uppercase">{text}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * Earn showcase: a parts list where the links pay the owner
 * ------------------------------------------------------------------------- */
const EARN_PARTS = [
  { cat: "Engine", brand: "Pure Turbos", name: "Pure800 turbo", program: "Brand program", clicks: 148 },
  { cat: "Suspension", brand: "KW", name: "V3 coilovers", program: "Impact", clicks: 96 },
  { cat: "Wheels", brand: "Volk", name: "TE37 SAGA 18x9.5", program: "eBay Partner", clicks: 211 },
  { cat: "Exhaust", brand: "HKS", name: "Hi-Power cat-back", program: "Amazon Associates", clicks: 73 },
  { cat: "Brakes", brand: "StopTech", name: "ST-40 big brake kit", program: "Impact", clicks: 41 },
];

export function EarnShowcase() {
  const total = EARN_PARTS.reduce((s, p) => s + p.clicks, 0);
  return (
    <div className="neon-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-display text-sm font-bold tracking-[0.16em] uppercase">Parts list · GHOST</p>
        <span className="rounded-full border border-signal/50 bg-signal/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-signal uppercase">5 of 5 earning</span>
      </div>
      <ul className="divide-y divide-line">
        {EARN_PARTS.map((p) => (
          <li key={p.name} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                <span className="text-foreground/70">{p.brand} </span>
                {p.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {p.cat} · via {p.program}
              </p>
            </div>
            <span className="hidden font-display text-sm font-bold text-neon-cyan tabular-nums sm:inline">{p.clicks} taps</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2.5 py-1.5 font-display text-[10px] font-bold tracking-[0.12em] uppercase">View part ↗</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4 border-t border-line bg-signal/10 px-4 py-3">
        <p className="text-xs text-foreground/80">Every tap goes through the owner&apos;s link. The program pays the commission. BuildTag takes nothing.</p>
        <p className="shrink-0 text-right">
          <span className="block font-display text-2xl leading-none font-extrabold text-signal tabular-nums">{total}</span>
          <span className="label-tech">affiliate taps</span>
        </p>
      </div>
    </div>
  );
}

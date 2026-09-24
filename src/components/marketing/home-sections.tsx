import Link from "next/link";

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Pricing. Uses the app's real plans: Free, Pro ($5/mo or $50/yr), and
 * custom-priced BuildTags Business. Physical BuildTags are priced per order.
 * ------------------------------------------------------------------------- */
export const BUSINESS_FEATURES = [
  "Create builds for customer vehicles",
  "Private claim links and printable claim cards",
  "Shop-recorded parts the owner can't edit",
  "Built by credit on every build page",
  "Business profile page",
  "Your own shop or dealership crew",
  "Team roles: owner, admin, manager, staff",
  "BuildTag ordering for customer builds",
];

function Bullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="mt-6 mb-8 space-y-2 text-sm text-foreground/85">
      {items.map((f) => (
        <li key={f} className="flex gap-2">
          <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", dot)} />
          {f}
        </li>
      ))}
    </ul>
  );
}

export function Pricing() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <div className="neon-card flex flex-col p-6 sm:p-7">
        <p className="label-tech">Free</p>
        <p className="mt-2 font-display text-5xl font-extrabold uppercase">
          $0 <span className="text-lg text-muted-foreground">forever</span>
        </p>
        <Bullets dot="bg-foreground/60" items={["1 vehicle, 12 photos", "Unlimited mods and part links", "Vehicle and owner socials", "Permanent BuildTag QR", "The BuildTag designer", "Scan and click analytics"]} />
        <Link href="/signup" className="btn-signal mt-auto w-full" data-event="pricing_clicked">
          Create your build
        </Link>
      </div>
      <div className="neon-card flex flex-col border-signal/50 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-2">
          <p className="label-tech text-signal">Pro</p>
          <span className="rounded border border-signal/50 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.2em] text-signal uppercase">2 months free yearly</span>
        </div>
        <p className="mt-2 font-display text-5xl font-extrabold uppercase">
          $5 <span className="text-lg text-muted-foreground">a month</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or <span className="font-display text-xl font-bold text-foreground">$50</span> a year
        </p>
        <Bullets dot="bg-signal" items={["Up to 10 vehicles", "60 photos per vehicle", "25 saved decal designs", "Start a crew and add members", "Pro badge on your build page", "Priority support"]} />
        <Link href="/signup?plan=pro" className="btn-ghost mt-auto w-full border-signal/60" data-event="pricing_clicked">
          Go Pro
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout by Stripe. Cancel any time.</p>
      </div>
      <div id="business" className="neon-card flex flex-col p-6 sm:p-7">
        <p className="label-tech">BuildTags Business</p>
        <p className="mt-2 font-display text-5xl font-extrabold uppercase">Custom</p>
        <p className="mt-1 text-sm text-muted-foreground">For dealers, performance shops, custom shops, motorcycle shops and installers.</p>
        <Bullets dot="bg-foreground/60" items={["Customer builds and claim cards", "Shop-installed part records", "Built by credit and a business page", "Shop crew and team roles"]} />
        <Link href="/business/contact?interest=customer_buildtags" className="btn-ghost mt-auto w-full" data-event="business_clicked">
          Contact us
        </Link>
      </div>
      <div className="neon-card flex flex-col p-6 sm:p-7">
        <p className="label-tech">Enterprise</p>
        <p className="mt-2 font-display text-4xl leading-none font-extrabold uppercase">Let&apos;s talk</p>
        <p className="mt-3 text-sm text-muted-foreground">OEM programs, dealer groups and manufacturers. Talk to us about:</p>
        <Bullets dot="bg-foreground/60" items={["Dealer group rollouts", "Custom branding", "API integration"]} />
        <Link href="/business/contact?interest=oem_partnership" className="btn-ghost mt-auto w-full" data-event="business_clicked">
          Discuss a partnership
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * FAQ. Physical BuildTags are ordered, not self-printed: no download answers.
 * ------------------------------------------------------------------------- */
const FAQ = [
  {
    q: "What is a BuildTag?",
    a: "A physical decal with a permanent QR code that goes on your car or motorcycle. Anyone who scans it lands on your build: mods, power, photos, socials and parts. You design it in the BuildTag designer and we print, cut and ship it.",
  },
  {
    q: "Does the QR code ever change?",
    a: "No. The QR holds a permanent short code, not a page name or your username. Rename the build, change your username or rebuild the whole thing and the same tag keeps working.",
  },
  {
    q: "Do I need a new BuildTag when my build changes?",
    a: "No. The tag stays on the vehicle and the digital build keeps evolving. Add mods, swap parts and upload new photos any time. The next scan shows the latest version.",
  },
  {
    q: "Can I update my build?",
    a: "Any time, from your phone or computer. Specs, power numbers, photos, parts, links and socials are all editable.",
  },
  {
    q: "Can I use it on a motorcycle?",
    a: "Yes. Bikes get the same build page, the same permanent QR and the same part links. The 3 × 3 in BuildTag fits a tank, a tail or a fairing.",
  },
  {
    q: "Can I link my socials?",
    a: "Yes. Add the vehicle's accounts and your own: Instagram, TikTok, YouTube, Facebook, X, Threads, Twitch, Discord or a website. Vehicle socials show first, and you can hide your personal ones.",
  },
  {
    q: "Can I add product links to my parts?",
    a: "Yes. Every part can link to where it's sold, including eligible affiliate links from programs you've joined yourself. BuildTags adds the required disclosure, takes no cut and doesn't promise any earnings.",
  },
  {
    q: "How do Crews work?",
    a: "A crew puts builds together under one name, with its own page. Pro members can start a crew for friends, a club or a local scene, and shops can run a crew for the builds that leave their bay.",
  },
  {
    q: "Can shops create builds for customers?",
    a: "Yes, with BuildTags Business. A shop creates the build, records the parts it installed and puts the BuildTag on the vehicle before delivery. The shop stays credited for its work.",
  },
  {
    q: "How does customer claiming work?",
    a: "The shop hands the owner a private claim card or link. It's a single-use credential: the owner signs in, claims the build and it moves into their garage. Scanning the public BuildTag on the vehicle never transfers ownership.",
  },
  {
    q: "Does someone need an account to view my build?",
    a: "No. Public builds open for anyone who scans the tag or has the link, no app and no sign-up.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-lg border border-line">
      {FAQ.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal [&::-webkit-details-marker]:hidden">
            <span className="font-display text-lg font-bold uppercase">{item.q}</span>
            <span className="font-display text-2xl text-signal transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="px-5 pb-5 text-sm text-foreground/80">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/** FAQ entries, exported for the page's structured data. */
export const FAQ_ENTRIES = FAQ;

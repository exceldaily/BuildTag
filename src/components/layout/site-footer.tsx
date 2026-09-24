import Link from "next/link";

import { Wordmark } from "./logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/signup", label: "Create Your Build" },
      { href: "/explore", label: "Explore Builds" },
      { href: "/leaderboard", label: "Scan Leaderboard" },
      { href: "/crews", label: "Crews" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Business",
    links: [
      { href: "/business", label: "BuildTags for Shops" },
      { href: "/business#enterprise", label: "Dealers & OEM" },
      { href: "/business/contact", label: "Contact Sales" },
      { href: "/claim", label: "Claim Your Build" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/community-guidelines", label: "Community Guidelines" },
      { href: "/dmca", label: "Copyright / DMCA" },
    ],
  },
];

const SOCIALS = [{ label: "Instagram", handle: "@buildtags.app", href: "https://www.instagram.com/buildtags.app" }];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-[#070708]">
      <div className="mx-auto grid max-w-[1720px] gap-10 px-4 py-14 sm:px-6 lg:px-10 2xl:px-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark className="h-10" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            The digital identity for your car or motorcycle, connected to one permanent BuildTag. Scan the build.
          </p>
          <div className="mt-6 flex gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="label-tech inline-block py-2 hover:text-foreground"
                aria-label={`BuildTag on ${s.label}: ${s.handle}`}
              >
                {s.label} <span className="normal-case tracking-normal text-foreground/70">{s.handle}</span>
              </a>
            ))}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="label-tech">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-block py-1.5 text-sm text-foreground/80 transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1720px] flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10 2xl:px-16">
          <span>
            © {new Date().getFullYear()} BuildTag. All rights reserved. Photography via{" "}
            <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" className="underline">
              Unsplash
            </a>
            .
          </span>
          <span className="font-display tracking-[0.2em] uppercase">Scan the build.</span>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

import { LogoMark } from "./logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/signup", label: "Create Your Build" },
      { href: "/explore", label: "Explore Builds" },
      { href: "/about", label: "About" },
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

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/" },
  { label: "TikTok", href: "https://www.tiktok.com/" },
  { label: "YouTube", href: "https://www.youtube.com/" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-[#070708]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-xl font-bold tracking-[0.08em] uppercase">
              Build<span className="text-signal">Tag</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            A digital build sheet for your car, connected to one permanent QR decal. Scan the build.
          </p>
          <div className="mt-6 flex gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="label-tech hover:text-foreground"
                aria-label={`BuildTag on ${s.label} (placeholder)`}
              >
                {s.label}
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
                  <Link href={l.href} className="text-sm text-foreground/80 transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} BuildTag. All rights reserved.</span>
          <span className="font-display tracking-[0.2em] uppercase">Scan the build.</span>
        </div>
      </div>
    </footer>
  );
}

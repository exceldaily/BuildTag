import Link from "next/link";
import { Menu, X } from "lucide-react";

import { getOptionalUser } from "@/lib/supabase/server";

import { Logo } from "./logo";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/dictionary";

export async function SiteHeader() {
  const [ctx, locale] = await Promise.all([getOptionalUser(), getLocale()]);
  const NAV = [
    { href: "/explore", label: t(locale, "nav_explore"), event: "explore_build_clicked" },
    { href: "/crews", label: t(locale, "nav_crews"), event: "crew_clicked" },
    { href: "/business", label: "For shops", event: "business_clicked" },
    { href: "/#pricing", label: "Pricing", event: "pricing_clicked" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 2xl:px-16">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex xl:gap-8" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-event={item.event}
              className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {ctx ? (
            <Link href="/dashboard" className="btn-ghost btn-small">
              {t(locale, "nav_garage")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground md:inline-flex"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-signal btn-small" data-event="signup_started">
                Create your build
              </Link>
            </>
          )}
          {/* Phones: a plain disclosure menu, no JavaScript. */}
          <details className="group relative md:hidden">
            <summary
              className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md border border-line focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:outline-none [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <Menu className="size-5 group-open:hidden" aria-hidden="true" />
              <X className="hidden size-5 group-open:block" aria-hidden="true" />
            </summary>
            <nav className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-popover shadow-xl" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-event={item.event}
                  className="block border-b border-line px-4 py-3 font-display text-sm font-semibold tracking-[0.14em] uppercase last:border-b-0 hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}
              {!ctx && (
                <Link href="/login" className="block px-4 py-3 font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase hover:bg-white/5">
                  Sign in
                </Link>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

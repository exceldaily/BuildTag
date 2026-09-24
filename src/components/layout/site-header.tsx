import Link from "next/link";

import { getOptionalUser } from "@/lib/supabase/server";

import { Logo } from "./logo";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/dictionary";

export async function SiteHeader() {
  const [ctx, locale] = await Promise.all([getOptionalUser(), getLocale()]);
  const NAV = [
    { href: "/explore", label: t(locale, "nav_explore") },
    { href: "/leaderboard", label: t(locale, "nav_leaderboard") },
    { href: "/build/ghost-2022-toyota-gr-supra", label: "Example" },
    { href: "/#how-it-works", label: "How it works" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-10 2xl:px-16">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
                className="hidden font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground sm:inline-flex"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-signal btn-small">
                Create your build
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

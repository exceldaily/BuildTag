import Link from "next/link";

import { getOptionalUser } from "@/lib/supabase/server";

import { Logo } from "./logo";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/build/ghost-2022-toyota-gr-supra", label: "Example" },
  { href: "/#how-it-works", label: "How it works" },
];

export async function SiteHeader() {
  const ctx = await getOptionalUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
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
              Garage
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

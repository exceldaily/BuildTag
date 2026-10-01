"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export interface TabLabels {
  garage: string;
  explore: string;
  orders: string;
  crew: string;
  business: string;
  profile: string;
  admin: string;
  more: string;
  crews: string;
  leaderboard: string;
  signOut: string;
}

const ICONS: Record<string, React.ReactNode> = {
  garage: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  explore: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 6-4 2 2-6z" />
    </>
  ),
  orders: <path d="M4 7h16l-1.5 12h-13zM9 7V5a3 3 0 0 1 6 0v2" />,
  crew: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 19.5a5 5 0 0 1 6.5-4.5" />
    </>
  ),
  business: <path d="M3 21V9l6-4v4l6-4v4l6-4v16zM7 17h2M11 17h2M15 17h2" />,
};

/**
 * Phones, touch tablets and the installed app (any width): the bottom tab bar. Five slots (Garage, Explore, Orders,
 * Crew or Business, More), shown to signed-in members on every page so the
 * installed app never loses its navigation. Renders its own spacer so page
 * content can scroll clear of the bar.
 */
export function AppTabBar({
  isAdmin,
  hasBusiness,
  avatarUrl,
  initial,
  labels,
}: {
  isAdmin: boolean;
  hasBusiness: boolean;
  avatarUrl: string | null;
  initial: string;
  labels: TabLabels;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const fourth = hasBusiness
    ? { key: "business", href: "/dashboard/business", label: labels.business, active: pathname.startsWith("/dashboard/business") }
    : { key: "crew", href: "/dashboard/crew", label: labels.crew, active: pathname.startsWith("/dashboard/crew") };
  const tabs = [
    { key: "garage", href: "/dashboard", label: labels.garage, active: pathname === "/dashboard" || pathname.startsWith("/dashboard/vehicles") },
    { key: "explore", href: "/explore", label: labels.explore, active: pathname.startsWith("/explore") || pathname.startsWith("/build/") || pathname.startsWith("/leaderboard") || pathname.startsWith("/crews") || pathname.startsWith("/crew/") },
    { key: "orders", href: "/dashboard/orders", label: labels.orders, active: pathname.startsWith("/dashboard/orders") },
    fourth,
  ];
  const more = [
    { href: "/dashboard/profile", label: labels.profile },
    hasBusiness ? { href: "/dashboard/crew", label: labels.crew } : { href: "/dashboard/business/register", label: labels.business },
    { href: "/crews", label: labels.crews },
    { href: "/leaderboards", label: labels.leaderboard },
    ...(isAdmin ? [{ href: "/admin", label: labels.admin }] : []),
  ];
  const moreActive = !tabs.some((t) => t.active) && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"));

  const item = "relative flex h-16 w-full flex-col items-center justify-center gap-1 font-display text-[10px] font-semibold tracking-[0.1em] uppercase transition-colors";
  const indicator = <span className="absolute inset-x-[22%] top-0 h-0.5 bg-signal" aria-hidden="true" />;

  return (
    <>
      <div className="app-chrome h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0" aria-hidden="true" />
      <nav aria-label="App" className="app-chrome app-tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur select-none">
        <ul className="mx-auto flex max-w-xl items-stretch">
          {tabs.map((t) => (
            <li key={t.key} className="min-w-0 flex-1">
              <Link href={t.href} aria-current={t.active ? "page" : undefined} className={cn(item, t.active ? "text-signal" : "text-muted-foreground")}>
                {t.active && indicator}
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {ICONS[t.key]}
                </svg>
                <span className="max-w-full truncate px-1">{t.label}</span>
              </Link>
            </li>
          ))}
          <li className="min-w-0 flex-1">
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={cn(item, moreActive || open ? "text-signal" : "text-muted-foreground")}>
              {(moreActive || open) && indicator}
              <span className={cn("flex size-6 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[11px] text-foreground ring-2", moreActive || open ? "ring-signal" : "ring-transparent")}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <span className="max-w-full truncate px-1">{labels.more}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-w-xl gap-0 border-line bg-background pb-[env(safe-area-inset-bottom)]">
          <SheetTitle className="sr-only">{labels.more}</SheetTitle>
          <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-foreground/20" aria-hidden="true" />
          <ul className="mt-2 divide-y divide-line">
            {more.map((m) => (
              <li key={m.href}>
                <Link href={m.href} onClick={() => setOpen(false)} className="flex h-14 items-center justify-between px-5 font-display text-base font-semibold tracking-[0.1em] uppercase">
                  {m.label}
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <form action={signOutAction} className="border-t border-line p-4">
            <button type="submit" className="btn-ghost w-full">
              {labels.signOut}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

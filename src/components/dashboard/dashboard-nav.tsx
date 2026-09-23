"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

function useItems(isAdmin: boolean) {
  const pathname = usePathname();
  return [
    { href: "/dashboard", label: "Garage", active: pathname === "/dashboard" || pathname.startsWith("/dashboard/vehicles") },
    { href: "/dashboard/orders", label: "Orders", active: pathname.startsWith("/dashboard/orders") },
    { href: "/dashboard/profile", label: "Profile", active: pathname.startsWith("/dashboard/profile") },
    { href: "/explore", label: "Explore", active: false },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", active: pathname.startsWith("/admin") }] : []),
  ];
}

const ICONS: Record<string, React.ReactNode> = {
  Garage: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  Orders: <path d="M4 7h16l-1.5 12h-13zM9 7V5a3 3 0 0 1 6 0v2" />,
  Profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  Explore: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 6-4 2 2-6z" />
    </>
  ),
  Admin: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
};

/** Desktop links in the header. */
export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const items = useItems(isAdmin);
  return (
    <nav className="hidden items-center gap-6 md:flex" aria-label="Dashboard">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={cn(
            "font-display text-sm font-semibold tracking-[0.14em] uppercase transition-colors",
            i.active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Phone: fixed bottom tab bar so every dashboard area is one tap away. */
export function DashboardTabBar({ isAdmin, avatarUrl, initial }: { isAdmin: boolean; avatarUrl: string | null; initial: string }) {
  const items = useItems(isAdmin);
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map((i) => (
          <li key={i.href} className="flex-1">
            <Link
              href={i.href}
              aria-current={i.active ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-display font-semibold tracking-[0.14em] uppercase transition-colors",
                i.active ? "text-signal" : "text-muted-foreground",
              )}
            >
              {i.label === "Profile" ? (
                <span className={cn("flex size-6 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-[11px] ring-2", i.active ? "ring-signal" : "ring-transparent")}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    initial
                  )}
                </span>
              ) : (
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {ICONS[i.label]}
                </svg>
              )}
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface NavLabels {
  garage: string;
  orders: string;
  crew: string;
  profile: string;
  explore: string;
  admin: string;
  business: string;
}

const EN: NavLabels = { garage: "Garage", orders: "Orders", crew: "Crew", profile: "Profile", explore: "Explore", admin: "Admin", business: "Business" };

function useItems(isAdmin: boolean, labels: NavLabels, hasBusiness: boolean) {
  const pathname = usePathname();
  return [
    { key: "Garage", href: "/dashboard", label: labels.garage, active: pathname === "/dashboard" || pathname.startsWith("/dashboard/vehicles") },
    { key: "Orders", href: "/dashboard/orders", label: labels.orders, active: pathname.startsWith("/dashboard/orders") },
    // Everyone sees Business: members open their dashboard, everyone else the registration form.
    { key: "Business", href: hasBusiness ? "/dashboard/business" : "/dashboard/business/register", label: labels.business, active: pathname.startsWith("/dashboard/business") },
    { key: "Crew", href: "/dashboard/crew", label: labels.crew, active: pathname.startsWith("/dashboard/crew") },
    { key: "Profile", href: "/dashboard/profile", label: labels.profile, active: pathname.startsWith("/dashboard/profile") },
    { key: "Explore", href: "/explore", label: labels.explore, active: false },
    ...(isAdmin ? [{ key: "Admin", href: "/admin", label: labels.admin, active: pathname.startsWith("/admin") }] : []),
  ];
}

const ICONS: Record<string, React.ReactNode> = {
  Garage: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  Orders: <path d="M4 7h16l-1.5 12h-13zM9 7V5a3 3 0 0 1 6 0v2" />,
  Crew: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 19.5a5 5 0 0 1 6.5-4.5" />
    </>
  ),
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
  Business: <path d="M3 21V9l6-4v4l6-4v4l6-4v16zM7 17h2M11 17h2M15 17h2" />,
};

/** Desktop links in the header. */
export function DashboardNav({ isAdmin, hasBusiness = false, labels = EN }: { isAdmin: boolean; hasBusiness?: boolean; labels?: NavLabels }) {
  const items = useItems(isAdmin, labels, hasBusiness);
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
export function DashboardTabBar({
  isAdmin,
  hasBusiness = false,
  avatarUrl,
  initial,
  labels = EN,
}: {
  isAdmin: boolean;
  hasBusiness?: boolean;
  avatarUrl: string | null;
  initial: string;
  labels?: NavLabels;
}) {
  // the phone bar keeps five slots: Explore makes room for Business
  const items = useItems(isAdmin, labels, hasBusiness).filter((i) => i.key !== "Explore");
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
              {i.key === "Profile" ? (
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
                  {ICONS[i.key]}
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

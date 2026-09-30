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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Garage", active: pathname === "/dashboard" || pathname.startsWith("/dashboard/vehicles") },
    { href: "/dashboard/orders", label: "Orders", active: pathname.startsWith("/dashboard/orders") },
    { href: "/dashboard/profile", label: "Profile", active: pathname.startsWith("/dashboard/profile") },
    { href: "/explore", label: "Explore", active: false },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", active: pathname.startsWith("/admin") }] : []),
  ];
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

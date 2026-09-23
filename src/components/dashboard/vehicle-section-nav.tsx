"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { path: "", label: "Overview" },
  { path: "/photos", label: "Photos" },
  { path: "/performance", label: "Performance" },
  { path: "/modifications", label: "Modifications" },
  { path: "/socials", label: "Socials" },
  { path: "/cost", label: "Build cost" },
  { path: "/buildtag", label: "BuildTag" },
  { path: "/analytics", label: "Analytics" },
  { path: "/settings", label: "Settings" },
];

export function VehicleSectionNav({ vehicleId }: { vehicleId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/vehicles/${vehicleId}`;
  if (pathname.startsWith(`${base}/setup`) || pathname.startsWith(`${base}/tag-designer`)) return null;

  return (
    <nav className="-mx-4 mt-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Vehicle sections">
      <ul className="flex gap-1">
        {SECTIONS.map((s) => {
          const href = `${base}${s.path}`;
          const active = s.path === "" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={s.path}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center border-b-2 px-3 font-display text-sm font-semibold tracking-[0.12em] uppercase whitespace-nowrap transition-colors",
                  active ? "border-signal text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

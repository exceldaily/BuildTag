"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { switchOrganizationAction } from "@/lib/actions/business";
import type { MyOrganization, OrgMemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANK: Record<OrgMemberRole, number> = { staff: 1, manager: 2, admin: 3, owner: 4 };

const SECTIONS: { href: string; label: string; min: OrgMemberRole; exact?: boolean }[] = [
  { href: "/dashboard/business", label: "Overview", min: "staff", exact: true },
  { href: "/dashboard/business/builds", label: "Builds", min: "staff" },
  { href: "/dashboard/business/analytics", label: "Analytics", min: "staff" },
  { href: "/dashboard/business/crew", label: "Crew", min: "staff" },
  { href: "/dashboard/business/orders", label: "Orders", min: "manager" },
  { href: "/dashboard/business/team", label: "Team", min: "staff" },
  { href: "/dashboard/business/settings", label: "Settings", min: "admin" },
];

export function BusinessNav({ role }: { role: OrgMemberRole }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mt-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Business sections">
      <ul className="flex gap-1">
        {SECTIONS.filter((s) => RANK[role] >= RANK[s.min]).map((s) => {
          const active = s.exact ? pathname === s.href : pathname.startsWith(s.href);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center border-b-2 px-3 font-display text-sm font-semibold tracking-[0.12em] whitespace-nowrap uppercase transition-colors",
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

export function OrgSwitcher({ orgs, activeId }: { orgs: MyOrganization[]; activeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (orgs.length < 2) return null;
  return (
    <label className="flex items-center gap-2">
      <span className="label-tech">Business</span>
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            const res = await switchOrganizationAction(id);
            if (!res.ok) toast.error(res.error);
            router.refresh();
          });
        }}
        className="field h-9 w-auto py-0"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

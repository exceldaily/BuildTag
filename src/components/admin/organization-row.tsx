"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { setOrganizationAction } from "@/lib/actions/admin-business";
import { ORGANIZATION_TYPES, type AdminOrganizationRow, type OrganizationStatus, type OrganizationType, type VerificationStatus } from "@/lib/types";

export function OrganizationRow({ org }: { org: AdminOrganizationRow }) {
  const [pending, start] = useTransition();
  const set = (input: { status?: OrganizationStatus; verified?: VerificationStatus; type?: OrganizationType }) =>
    start(async () => {
      const res = await setOrganizationAction(org.id, input);
      if (!res.ok) toast.error(res.error);
      else toast.success("Updated");
    });

  return (
    <li className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0 text-sm">
        <p className="font-display text-lg font-bold uppercase">
          <Link href={`/org/${org.slug}`} className="hover:underline" target="_blank">
            {org.name}
          </Link>
        </p>
        <p className="text-muted-foreground">
          {org.owner_username ? `@${org.owner_username}` : "No owner"} · {org.member_count} members · {org.build_count} builds
          {org.location_text ? ` · ${org.location_text}` : ""}
          {org.email ? ` · ${org.email}` : ""}
        </p>
        <p className="label-tech mt-1">Registered {new Date(org.created_at).toLocaleDateString()}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Type" defaultValue={org.organization_type} disabled={pending} onChange={(e) => set({ type: e.target.value as OrganizationType })} className="field h-9 w-auto py-0">
          {ORGANIZATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select aria-label="Status" defaultValue={org.status} disabled={pending} onChange={(e) => set({ status: e.target.value as OrganizationStatus })} className="field h-9 w-auto py-0">
          <option value="pending">Pending</option>
          <option value="active">Active (Business on)</option>
          <option value="suspended">Suspended</option>
        </select>
        <select aria-label="Verification" defaultValue={org.verified_status} disabled={pending} onChange={(e) => set({ verified: e.target.value as VerificationStatus })} className="field h-9 w-auto py-0">
          <option value="unverified">Unverified</option>
          <option value="pending">Verification pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </li>
  );
}

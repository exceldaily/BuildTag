import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { requireBusiness } from "@/lib/db/business";
import { ORG_ROLE_LABEL, ORGANIZATION_TYPE_LABEL } from "@/lib/types";
import { BusinessNav, OrgSwitcher } from "@/components/business/business-nav";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { orgs, org } = await requireBusiness();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">BuildTags Business</p>
          <h1 className="mt-2 flex items-center gap-2 truncate text-4xl leading-none sm:text-5xl">
            {org.name}
            {org.verified_status === "verified" && <BadgeCheck className="size-7 shrink-0 text-neon-cyan" aria-label="Verified business" />}
          </h1>
          <p className="label-tech mt-2">
            {ORGANIZATION_TYPE_LABEL[org.organization_type]} · {ORG_ROLE_LABEL[org.role]}
            {org.status === "active" && (
              <>
                {" · "}
                <Link href={`/org/${org.slug}`} className="hover:text-foreground" target="_blank" rel="noopener">
                  Public page ↗
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrgSwitcher orgs={orgs} activeId={org.id} />
          <Link href="/dashboard/business/register" className="btn-ghost btn-small">
            Add business
          </Link>
        </div>
      </div>

      {org.status !== "active" && (
        <div className="mt-6 rounded-lg border border-neon-amber/50 bg-neon-amber/10 p-4 text-sm">
          <p className="font-display text-base font-bold tracking-wide uppercase">
            {org.status === "suspended" ? "This business is suspended" : "Profile registered. Build tools are off for now."}
          </p>
          <p className="mt-1 text-foreground/80">
            {org.status === "suspended"
              ? "Creating builds, claims and crews is paused. Contact us if this looks wrong."
              : "BuildTags Business is set up with our team. Once we turn it on you can create customer builds, send claim links and start your crew."}{" "}
            <Link href="/business/contact" className="underline">
              Contact BuildTags Business
            </Link>
          </p>
        </div>
      )}

      <BusinessNav role={org.role} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

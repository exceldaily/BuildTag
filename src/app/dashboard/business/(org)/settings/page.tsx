import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireBusiness } from "@/lib/db/business";
import { listSocialLinks } from "@/lib/db/vehicles";
import type { OrganizationRow } from "@/lib/types";
import { OrgProfileForm } from "@/components/business/org-profile-form";
import { SocialsManager } from "@/components/dashboard/socials-manager";

export const metadata: Metadata = { title: "Business settings", robots: { index: false } };

export default async function BusinessSettingsPage() {
  const { client, org } = await requireBusiness("admin");
  const [{ data }, links] = await Promise.all([client.from("organizations").select("*").eq("id", org.id).maybeSingle(), listSocialLinks(client, "shop", org.id)]);
  if (!data) notFound();

  return (
    <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
      <section>
        <h2 className="text-2xl">Business profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">Shown on your public page and wherever your business is credited on a build.</p>
        <div className="panel mt-4 p-5">
          <OrgProfileForm org={data as OrganizationRow} />
        </div>
      </section>
      <section>
        <SocialsManager ownerType="shop" ownerId={org.id} links={links} title="Business socials" description="Linked from your public business page." />
      </section>
    </div>
  );
}

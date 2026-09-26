import type { Metadata } from "next";

import { listSocialLinks } from "@/lib/db/vehicles";
import { PLAN_FEATURES, getUserPlan } from "@/lib/db/plan";
import { requireProfile } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/dashboard/forms/profile-form";
import { SocialsManager } from "@/components/dashboard/socials-manager";
import { PlanPanel } from "@/components/dashboard/plan-panel";
import { proCheckoutAvailable } from "@/lib/stripe";
import type { AccountDeletionCheck, SubscriptionRow } from "@/lib/types";
import { DeleteAccount } from "@/components/dashboard/delete-account";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage({ searchParams }: PageProps<"/dashboard/profile">) {
  const sp = await searchParams;
  const { client, user, profile } = await requireProfile("/dashboard/profile");
  const [links, plan, subRes, deletionRes] = await Promise.all([
    listSocialLinks(client, "profile", user.id),
    getUserPlan(client, user.id),
    client.from("subscriptions").select("status, current_period_end, provider_customer_id").eq("user_id", user.id).maybeSingle(),
    client.rpc("account_deletion_check"),
  ]);
  const deletion = (deletionRes.data as unknown as AccountDeletionCheck | null) ?? null;
  const subscription = (subRes.data as Pick<SubscriptionRow, "status" | "current_period_end" | "provider_customer_id"> | null) ?? null;

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
      <div className="max-w-2xl xl:max-w-4xl space-y-12">
        <ProfileForm profile={profile} />
        <SocialsManager
          ownerType="profile"
          ownerId={user.id}
          links={links}
          title="Your socials"
          description="Personal accounts. They appear in the owner section of your builds, separate from each vehicle's own accounts."
        />
        {deletion && <DeleteAccount check={deletion} />}
      </div>
      <aside className="space-y-4">
        <PlanPanel plan={plan} subscription={subscription} features={PLAN_FEATURES} billingEnabled={proCheckoutAvailable()} justUpgraded={sp.upgraded === "1"} />
        <div className="panel p-5 text-sm text-muted-foreground">
          <p className="label-tech">Account</p>
          <p className="mt-2 truncate">{user.email}</p>
        </div>
      </aside>
    </div>
  );
}

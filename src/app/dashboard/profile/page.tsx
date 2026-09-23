import type { Metadata } from "next";

import { listSocialLinks } from "@/lib/db/vehicles";
import { PLAN_FEATURES, getUserPlan } from "@/lib/db/plan";
import { requireProfile } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/dashboard/forms/profile-form";
import { SocialsManager } from "@/components/dashboard/socials-manager";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const { client, user, profile } = await requireProfile("/dashboard/profile");
  const [links, plan] = await Promise.all([listSocialLinks(client, "profile", user.id), getUserPlan(client, user.id)]);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
      <div className="max-w-2xl space-y-12">
        <ProfileForm profile={profile} />
        <SocialsManager
          ownerType="profile"
          ownerId={user.id}
          links={links}
          title="Your socials"
          description="Personal accounts. They appear in the owner section of your builds, separate from each vehicle's own accounts."
        />
      </div>
      <aside className="space-y-4">
        <div className="panel p-5">
          <p className="label-tech">Plan</p>
          <p className="mt-1 text-3xl font-display uppercase">{plan}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {PLAN_FEATURES[plan].map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
          {plan === "free" && (
            <div className="mt-4 rounded-md border border-line p-3 text-xs text-muted-foreground">
              <p className="font-display text-sm font-bold tracking-wider text-foreground uppercase">Pro</p>
              <ul className="mt-1 space-y-1">
                {PLAN_FEATURES.pro.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <p className="mt-3">Billing is not switched on yet. Pro will be available soon.</p>
            </div>
          )}
        </div>
        <div className="panel p-5 text-sm text-muted-foreground">
          <p className="label-tech">Account</p>
          <p className="mt-2 truncate">{user.email}</p>
        </div>
      </aside>
    </div>
  );
}

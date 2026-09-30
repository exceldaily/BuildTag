import { getOptionalUser } from "@/lib/supabase/server";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n";
import type { ProfileRow } from "@/lib/types";

import { AppTabBar, type TabLabels } from "./app-tab-bar";

export function tabLabels(L: Locale): TabLabels {
  return {
    garage: t(L, "nav_garage"),
    explore: t(L, "nav_explore"),
    orders: t(L, "nav_orders"),
    crew: t(L, "nav_crew"),
    business: t(L, "nav_business"),
    profile: t(L, "nav_profile"),
    admin: t(L, "nav_admin"),
    more: t(L, "nav_more"),
    crews: t(L, "nav_crews"),
    leaderboard: t(L, "nav_leaderboard"),
    signOut: t(L, "nav_sign_out"),
  };
}

/**
 * The phone tab bar for pages outside the dashboard (explore, build pages,
 * crews, admin). Visitors who aren't signed in get nothing: they keep the
 * normal site header.
 */
export async function SignedInTabBar() {
  const ctx = await getOptionalUser();
  if (!ctx) return null;
  const [{ data: profile }, { data: isAdmin }, { data: orgs }] = await Promise.all([ctx.client.rpc("ensure_profile"), ctx.client.rpc("is_admin"), ctx.client.rpc("my_organizations")]);
  const p = profile as ProfileRow | null;
  if (!p) return null;
  return (
    <AppTabBar
      isAdmin={Boolean(isAdmin)}
      hasBusiness={Array.isArray(orgs) && orgs.length > 0}
      avatarUrl={p.avatar_url}
      initial={(p.display_name.slice(0, 1) || p.username.slice(0, 1)).toUpperCase()}
      labels={tabLabels(p.locale)}
    />
  );
}

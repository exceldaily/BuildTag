import Link from "next/link";

import { requireProfile } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/layout/logo";
import { DashboardNav, DashboardTabBar } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = await requireProfile("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-10 2xl:px-16">
          <Logo href="/dashboard" />
          <DashboardNav isAdmin={isAdmin} />
          <div className="flex items-center gap-2">
            <Link href="/dashboard/profile" className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5" aria-label="Your profile">
              <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-xs font-bold uppercase">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  profile.display_name.slice(0, 1) || profile.username.slice(0, 1)
                )}
              </span>
              <span className="hidden max-w-32 truncate text-muted-foreground sm:inline">@{profile.username}</span>
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="btn-ghost btn-small">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1720px] px-4 py-8 pb-24 sm:px-6 lg:px-10 2xl:px-16 md:py-10 md:pb-10">{children}</div>
      </main>
      <DashboardTabBar isAdmin={isAdmin} avatarUrl={profile.avatar_url} initial={(profile.display_name.slice(0, 1) || profile.username.slice(0, 1)).toUpperCase()} />
    </div>
  );
}

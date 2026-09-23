import Link from "next/link";

import { requireProfile } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/layout/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = await requireProfile("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/dashboard" />
          <DashboardNav isAdmin={isAdmin} />
          <div className="flex items-center gap-2">
            <Link href="/dashboard/profile" className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5 sm:inline-flex">
              <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-xs font-bold uppercase">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  profile.display_name.slice(0, 1) || profile.username.slice(0, 1)
                )}
              </span>
              <span className="max-w-32 truncate text-muted-foreground">@{profile.username}</span>
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
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-10">{children}</div>
      </main>
    </div>
  );
}

import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/layout/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-signal/40 bg-background pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-10 2xl:px-16">
          <div className="flex items-center gap-4">
            <Logo href="/admin" />
            <span className="rounded bg-signal px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.2em] text-white uppercase">Admin</span>
          </div>
          <nav className="-mr-4 flex items-center gap-5 overflow-x-auto pr-4 whitespace-nowrap" aria-label="Admin">
            {[
              ["/admin", "Search"],
              ["/admin/reports", "Reports"],
              ["/admin/orders", "Orders"],
              ["/admin/members", "Members"],
              ["/admin/tags", "Free tags"],
              ["/admin/organizations", "Businesses"],
              ["/admin/business-inquiries", "Inquiries"],
              ["/admin/legal", "Legal"],
              ["/dashboard", "Garage"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="font-display text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground">
                {label}
              </Link>
            ))}
            <form action={signOutAction}>
              <button type="submit" className="btn-ghost btn-small">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1720px] flex-1 px-4 py-8 sm:px-6 lg:px-10 2xl:px-16">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";

import { requireAdmin } from "@/lib/supabase/server";
import type { AdminBans } from "@/lib/types";
import { BanEmailForm, UnbanEmailButton, UnbanUserButton } from "@/components/admin/ban-controls";

export const metadata: Metadata = { title: "Bans", robots: { index: false } };

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function AdminBansPage() {
  const { client } = await requireAdmin();
  const { data, error } = await client.rpc("admin_list_bans");
  if (error) throw new Error(error.message);
  const bans = data as unknown as AdminBans;

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Bans</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Ban an account from Members. A banned account is signed out and can&apos;t sign in, its builds are hidden, and its email can&apos;t be used
          to sign up again. Unbanning reverses all of that. Ban an email here to stop it from ever creating an account.
        </p>
      </div>

      <section>
        <h2 className="text-2xl">
          Banned accounts <span className="text-muted-foreground">{bans.accounts.length}</span>
        </h2>
        {bans.accounts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No banned accounts.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {bans.accounts.map((b) => (
              <li key={b.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {b.username ? `@${b.username}` : b.email} <span className="text-muted-foreground">{b.email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.reason || "No reason given"} · {b.hidden_builds} build{b.hidden_builds === 1 ? "" : "s"} hidden · {fmt(b.created_at)}
                    {b.banned_by ? ` by @${b.banned_by}` : ""}
                  </p>
                </div>
                <UnbanUserButton userId={b.user_id} label={b.username ? `@${b.username}` : b.email} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl">
          Banned emails <span className="text-muted-foreground">{bans.emails.length}</span>
        </h2>
        <div className="mt-3">
          <BanEmailForm />
        </div>
        {bans.emails.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {bans.emails.map((e) => (
              <li key={e.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{e.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.reason || "No reason given"} · {fmt(e.created_at)}
                    {e.banned_by ? ` by @${e.banned_by}` : ""}
                    {e.from_account ? " · from an account ban (unban the account to lift it)" : ""}
                  </p>
                </div>
                {!e.from_account && <UnbanEmailButton email={e.email} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

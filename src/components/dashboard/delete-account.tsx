"use client";

import { useActionState, useState } from "react";

import { deleteAccountAction } from "@/lib/actions/account";
import type { AccountDeletionCheck } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";

/** Danger zone on the Profile page: explains exactly what happens, lists blockers, then deletes. */
export function DeleteAccount({ check }: { check: AccountDeletionCheck }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccountAction, null);
  const blocked = check.sole_owner_of.length > 0 || check.orders_in_progress > 0 || check.active_subscription;

  return (
    <section className="rounded-lg border border-destructive/40 p-5">
      <h2 className="text-2xl">Delete account</h2>
      <p className="mt-2 text-sm text-muted-foreground">Permanently deletes your account. This can&apos;t be undone.</p>

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-small mt-4 border-destructive/50 text-destructive">
          Delete my account…
        </button>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          {blocked && (
            <div className="rounded-md border border-neon-amber/50 bg-neon-amber/10 p-3" role="alert">
              <p className="font-medium">Before you can delete your account:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {check.sole_owner_of.map((o) => (
                  <li key={o.id}>
                    You&apos;re the only owner of <strong>{o.name}</strong>. Make another team member an owner (Business → Team), or contact us to close
                    the business.
                  </li>
                ))}
                {check.orders_in_progress > 0 && (
                  <li>
                    You have {check.orders_in_progress} order{check.orders_in_progress === 1 ? "" : "s"} in progress. Wait until it ships, or contact us to
                    cancel it.
                  </li>
                )}
                {check.active_subscription && <li>Cancel your Pro subscription with Manage billing (on this page).</li>}
              </ul>
            </div>
          )}

          <div>
            <p className="font-medium">What happens</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Your profile, avatar, social links, crew, designs and business memberships are deleted.</li>
              {check.deleted_vehicles.length > 0 && (
                <li>
                  These builds are deleted with their photos, parts and scan history, and their BuildTag QR codes stop working:{" "}
                  {check.deleted_vehicles.map((v) => v.nickname || vehicleTitle(v)).join(", ")}.
                </li>
              )}
              {check.returned_vehicles.length > 0 && (
                <li>
                  Builds a shop created for you go back to that shop and their decals keep working. Your social links are removed from them:{" "}
                  {check.returned_vehicles.map((v) => `${v.nickname || vehicleTitle(v)} (${v.organization})`).join(", ")}.
                </li>
              )}
              {check.kept_orders > 0 && <li>Records of past paid orders are kept for tax and accounting, no longer linked to you.</li>}
            </ul>
          </div>

          {!blocked && (
            <form action={action} className="space-y-3">
              <label className="grid gap-1">
                <span className="label-tech">Password</span>
                <input name="password" type="password" required autoComplete="current-password" className="field" />
              </label>
              <label className="grid gap-1">
                <span className="label-tech">Type DELETE to confirm</span>
                <input name="confirm" required autoComplete="off" pattern="DELETE" className="field" />
              </label>
              {state && !state.ok && (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className="btn-signal btn-small bg-destructive">
                  {pending ? "Deleting…" : "Permanently delete my account"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-small">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

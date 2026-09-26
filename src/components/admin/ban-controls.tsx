"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { adminBanEmailAction, adminBanUserAction, adminUnbanEmailAction, adminUnbanUserAction } from "@/lib/actions/admin";

type Result = { ok: boolean; error?: string };

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else {
        toast.success(success);
        after?.();
      }
    });
  return { pending, run };
}

/** Members row: ban (asks for a reason) or unban. Banning also hides their builds and bans their email. */
export function BanToggle({ userId, username, banned, disabled }: { userId: string; username: string; banned: boolean; disabled?: boolean }) {
  const { pending, run } = useRun();
  if (disabled) return null;
  if (banned) {
    return (
      <button
        type="button"
        disabled={pending}
        className="btn-ghost btn-small h-8 text-[10px]"
        onClick={() => {
          if (confirm(`Unban @${username}? They can sign in again, and the builds the ban hid come back.`))
            run(() => adminUnbanUserAction(userId), `@${username} unbanned`);
        }}
      >
        Unban
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost btn-small h-8 border-destructive/50 text-[10px] text-destructive"
      onClick={() => {
        const reason = prompt(`Ban @${username}? They're signed out, can't sign in, their builds are hidden and their email can't sign up again.\n\nReason (only admins see this):`);
        if (reason === null) return;
        run(() => adminBanUserAction(userId, { reason, hideBuilds: true, banEmail: true }), `@${username} banned`);
      }}
    >
      Ban
    </button>
  );
}

export function UnbanUserButton({ userId, label }: { userId: string; label: string }) {
  const { pending, run } = useRun();
  return (
    <button type="button" disabled={pending} className="btn-ghost btn-small" onClick={() => confirm(`Unban ${label}?`) && run(() => adminUnbanUserAction(userId), `${label} unbanned`)}>
      Unban
    </button>
  );
}

export function UnbanEmailButton({ email }: { email: string }) {
  const { pending, run } = useRun();
  return (
    <button type="button" disabled={pending} className="btn-ghost btn-small" onClick={() => run(() => adminUnbanEmailAction(email), `${email} can sign up again`)}>
      Remove
    </button>
  );
}

export function BanEmailForm() {
  const { pending, run } = useRun();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={(form) => {
        const email = String(form.get("email") ?? "");
        const reason = String(form.get("reason") ?? "");
        run(() => adminBanEmailAction(email, reason), `${email} banned`, () => formRef.current?.reset());
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="grid min-w-64 flex-1 gap-1 text-sm">
        <span className="label-tech">Email address</span>
        <input name="email" type="email" required maxLength={200} className="field" autoComplete="off" />
      </label>
      <label className="grid min-w-48 flex-1 gap-1 text-sm">
        <span className="label-tech">Reason (admins only)</span>
        <input name="reason" maxLength={500} className="field" autoComplete="off" />
      </label>
      <button type="submit" disabled={pending} className="btn-signal h-10">
        Ban email
      </button>
    </form>
  );
}

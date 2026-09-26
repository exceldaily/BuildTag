"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { adminSetAdminAction } from "@/lib/actions/admin";

/** Make a member a BuildTags admin, or remove it. Confirms first: admins can see and change everything. */
export function AdminRoleToggle({ userId, username, isAdmin, isMe }: { userId: string; username: string; isAdmin: boolean; isMe: boolean }) {
  const [pending, start] = useTransition();
  if (isMe) return <span className="text-xs text-muted-foreground">You</span>;

  const run = () => {
    const question = isAdmin
      ? `Remove admin from @${username}? They lose access to the Admin area.`
      : `Make @${username} a BuildTags admin? Admins can see every account, business and order, and change them.`;
    if (!confirm(question)) return;
    start(async () => {
      const res = await adminSetAdminAction(userId, !isAdmin);
      if (!res.ok) toast.error(res.error);
      else toast.success(isAdmin ? `@${username} is no longer an admin` : `@${username} is now an admin`);
    });
  };

  return (
    <button type="button" disabled={pending} onClick={run} className="btn-ghost btn-small h-8 text-[10px]">
      {pending ? "Saving…" : isAdmin ? "Remove admin" : "Make admin"}
    </button>
  );
}

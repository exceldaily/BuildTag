"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { addTeamMemberAction, removeTeamMemberAction, setTeamRoleAction } from "@/lib/actions/business";
import { ORG_ROLE_LABEL, type OrgMemberRole, type OrgTeamMember } from "@/lib/types";

const ROLES: OrgMemberRole[] = ["owner", "admin", "manager", "staff"];

/**
 * Admins manage managers and staff; only owners grant or change admin/owner
 * (the database enforces both, this just hides what can't work).
 */
export function TeamManager({ orgId, team, myRole, myUserId }: { orgId: string; team: OrgTeamMember[]; myRole: OrgMemberRole; myUserId: string }) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isOwner = myRole === "owner";
  const canManage = myRole === "owner" || myRole === "admin";

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else toast.success(success);
    });

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-line rounded-lg border border-line">
        {team.map((m) => {
          const editable = canManage && m.user_id !== myUserId && (isOwner || (m.role !== "owner" && m.role !== "admin"));
          return (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-sm font-bold uppercase">
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  (m.display_name || m.username).slice(0, 1)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.display_name || m.username} <span className="text-muted-foreground">@{m.username}</span>
                  {m.user_id === myUserId && <span className="text-muted-foreground"> (you)</span>}
                </p>
              </div>
              {editable ? (
                <select
                  aria-label={`Role for ${m.username}`}
                  defaultValue={m.role}
                  disabled={pending}
                  className="field h-9 w-auto py-0"
                  onChange={(e) => run(() => setTeamRoleAction(orgId, m.user_id, e.target.value as OrgMemberRole), "Role updated")}
                >
                  {ROLES.filter((r) => isOwner || (r !== "owner" && r !== "admin")).map((r) => (
                    <option key={r} value={r}>
                      {ORG_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="label-tech">{ORG_ROLE_LABEL[m.role]}</span>
              )}
              {(editable || m.user_id === myUserId) && (
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-destructive"
                  disabled={pending}
                  onClick={() => {
                    const self = m.user_id === myUserId;
                    if (!window.confirm(self ? "Leave this business?" : `Remove @${m.username} from the team?`)) return;
                    run(() => removeTeamMemberAction(orgId, m.user_id), self ? "You left the business" : "Removed");
                  }}
                >
                  {m.user_id === myUserId ? "Leave" : "Remove"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {canManage && (
        <form
          ref={formRef}
          className="panel grid gap-3 p-4 sm:grid-cols-[1fr_160px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            start(async () => {
              const res = await addTeamMemberAction(orgId, form);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              formRef.current?.reset();
              toast.success("Added to the team");
            });
          }}
        >
          <div>
            <label htmlFor="team-username" className="field-label">
              BuildTag username
            </label>
            <input id="team-username" name="username" placeholder="@username" autoComplete="off" className="field" />
          </div>
          <div>
            <label htmlFor="team-role" className="field-label">
              Role
            </label>
            <select id="team-role" name="role" defaultValue="staff" className="field">
              {(isOwner ? (["admin", "manager", "staff"] as const) : (["manager", "staff"] as const)).map((r) => (
                <option key={r} value={r}>
                  {ORG_ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-signal" disabled={pending}>
            Add member
          </button>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            They need a BuildTag account first. Staff create and edit builds and send claim links; managers also see orders; admins manage the
            team and profile.
          </p>
        </form>
      )}
    </div>
  );
}

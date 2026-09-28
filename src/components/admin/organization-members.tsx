"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { adminAddOrgMemberAction, adminRevokeOrgInviteAction, adminSetOrgMemberAction } from "@/lib/actions/admin-business";
import { switchOrganizationAction } from "@/lib/actions/business";
import { ORG_ROLE_LABEL, type AdminOrganizationDetail, type OrgMemberRole } from "@/lib/types";

const ROLES: OrgMemberRole[] = ["owner", "admin", "manager", "staff"];

/** Admin member management for any business, including adding yourself to test its dashboard. */
export function OrganizationMembers({ org, myUserId, myIdentifier }: { org: AdminOrganizationDetail; myUserId: string; myIdentifier: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const iAmMember = org.members.some((m) => m.user_id === myUserId);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else {
        toast.success(success);
        after?.();
      }
    });

  const add = (form: FormData) => {
    const identifier = String(form.get("identifier") ?? "");
    const role = String(form.get("role") ?? "staff") as OrgMemberRole;
    start(async () => {
      const res = await adminAddOrgMemberAction(org.id, identifier, role);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.data === "invited" ? "Invite saved. They join after signing up with that email." : "Member added");
        formRef.current?.reset();
      }
    });
  };

  const openDashboard = () =>
    run(() => switchOrganizationAction(org.id), `Switched to ${org.name}`, () => router.push("/dashboard/business"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {iAmMember ? (
          <button type="button" disabled={pending} onClick={openDashboard} className="btn-signal btn-small">
            Open business dashboard as me
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => adminAddOrgMemberAction(org.id, myIdentifier, "owner"), "You're now an owner")} className="btn-ghost btn-small">
            Add me as owner (testing)
          </button>
        )}
      </div>

      <section>
        <h2 className="text-2xl">
          Members <span className="text-muted-foreground">{org.members.length}</span>
        </h2>
        {org.members.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No members yet. Add an owner below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {org.members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {m.display_name || m.username || m.email}
                    {m.username && <span className="text-muted-foreground"> @{m.username}</span>}
                    {m.user_id === myUserId && <span className="text-muted-foreground"> (you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <select
                  aria-label={`Role for ${m.username ?? m.email}`}
                  defaultValue={m.role}
                  disabled={pending}
                  className="field h-9 w-auto py-0"
                  onChange={(e) => run(() => adminSetOrgMemberAction(org.id, m.user_id, { role: e.target.value as OrgMemberRole }), "Role updated")}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ORG_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  className="btn-ghost btn-small"
                  onClick={() => {
                    if (confirm(`Remove ${m.username ?? m.email} from ${org.name}?`)) run(() => adminSetOrgMemberAction(org.id, m.user_id, { remove: true }), "Removed");
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {org.invites.length > 0 && (
        <section>
          <h3 className="text-xl">Pending invites</h3>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {org.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{i.email}</span>
                <span className="label-tech">{ORG_ROLE_LABEL[i.role]}</span>
                <span className="label-tech">{new Date(i.created_at).toLocaleDateString()}</span>
                <button type="button" disabled={pending} className="btn-ghost btn-small" onClick={() => run(() => adminRevokeOrgInviteAction(org.id, i.id), "Invite revoked")}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form ref={formRef} action={add} className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-64 flex-1 gap-1 text-sm">
          <span className="label-tech">Add member: username or email</span>
          <input name="identifier" required minLength={2} maxLength={200} placeholder="@username or name@shop.com" className="field" autoComplete="off" />
        </label>
        <select name="role" defaultValue="staff" aria-label="Role" className="field h-10 w-auto py-0">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ORG_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="btn-signal h-10">
          Add
        </button>
      </form>
    </div>
  );
}

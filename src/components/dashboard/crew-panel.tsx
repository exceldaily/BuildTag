"use client";

import Link from "next/link";
import { Crown, LogOut, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { addCrewMemberAction, createCrewAction, deleteCrewAction, removeCrewMemberAction, updateCrewAction } from "@/lib/actions/crews";
import type { Crew } from "@/lib/types";

interface Props {
  crew: Crew | null;
  userId: string;
  isPro: boolean;
}

export function CrewPanel({ crew, userId, isPro }: Props) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const usernameRef = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>, okMsg?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      setErrors({});
      if (okMsg) toast.success(okMsg);
    });

  /* ---------------- no crew yet ---------------- */
  if (!crew) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="panel p-6">
          <p className="eyebrow text-signal">Pro feature</p>
          <h2 className="mt-2 text-3xl">Start a crew</h2>
          <p className="mt-2 max-w-lg text-sm text-foreground/80">
            A crew is your group on BuildTag. Add members by username, get a shared crew page with everyone&apos;s builds and combined scans, and a crew badge on every member&apos;s build page.
          </p>
          {isPro ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                run(() => createCrewAction(form), "Crew created");
              }}
            >
              <label className="block">
                <span className="field-label">Crew name</span>
                <input name="name" required minLength={2} maxLength={40} placeholder="Midnight Runners" className="field" />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </label>
              <label className="block">
                <span className="field-label">
                  Tagline <span className="normal-case tracking-normal">(optional)</span>
                </span>
                <input name="tagline" maxLength={140} placeholder="Orlando street builds since 2019" className="field" />
              </label>
              <button type="submit" disabled={pending} className="btn-signal">
                <Users className="size-4" aria-hidden="true" />
                {pending ? "Creating…" : "Create crew"}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-md border border-signal/40 bg-signal/5 p-4">
              <p className="text-sm">Crews need a Pro account. $5 a month or $50 a year.</p>
              <Link href="/dashboard/profile" className="btn-signal mt-3">
                Go Pro
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">Already in someone else&apos;s crew? It shows up here once they add your username.</p>
            </div>
          )}
        </section>
        <aside className="panel p-5 text-sm text-muted-foreground">
          <p className="label-tech">How crews work</p>
          <ul className="mt-3 space-y-2">
            <li>· The Pro member who creates the crew is the owner and adds members by their BuildTag username.</li>
            <li>· Members do not need Pro. One crew per person, up to 25 members.</li>
            <li>· The crew page lists every member&apos;s public builds and adds up their scans.</li>
            <li>· Members can leave any time. The owner can remove members or delete the crew.</li>
          </ul>
        </aside>
      </div>
    );
  }

  /* ---------------- has a crew ---------------- */
  const isOwner = crew.members.some((m) => m.user_id === userId && m.role === "owner");
  const me = crew.members.find((m) => m.user_id === userId);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <section className="panel p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow text-signal">{isOwner ? "Your crew" : "Crew"}</p>
              <h2 className="mt-1 text-3xl">{crew.name}</h2>
              {crew.tagline && <p className="mt-1 text-sm text-foreground/80">{crew.tagline}</p>}
            </div>
            <Link href={`/crew/${crew.slug}`} className="btn-ghost btn-small shrink-0">
              View crew page
            </Link>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
            {[
              ["Members", crew.members.length],
              ["Public builds", crew.builds.length],
              ["Crew scans", crew.total_scans],
            ].map(([l, v]) => (
              <div key={String(l)} className="bg-surface px-4 py-3">
                <dt className="label-tech">{l}</dt>
                <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {isOwner && (
            <form
              className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => updateCrewAction(new FormData(e.currentTarget)), "Saved");
              }}
            >
              <label className="block">
                <span className="field-label">Crew name</span>
                <input name="name" defaultValue={crew.name} required minLength={2} maxLength={40} className="field" />
              </label>
              <label className="block">
                <span className="field-label">Tagline</span>
                <input name="tagline" defaultValue={crew.tagline} maxLength={140} className="field" />
              </label>
              <button type="submit" disabled={pending} className="btn-ghost">
                Save
              </button>
            </form>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl">Members</h3>
            <span className="label-tech">{crew.members.length} / 25</span>
          </div>
          {isOwner && (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = usernameRef.current?.value.trim() ?? "";
                if (!v) return;
                run(() => addCrewMemberAction(v), "Member added");
                if (usernameRef.current) usernameRef.current.value = "";
              }}
            >
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">@</span>
                <input ref={usernameRef} placeholder="username" autoCapitalize="none" autoComplete="off" className="field pl-8" aria-label="BuildTag username to add" />
              </div>
              <button type="submit" disabled={pending} className="btn-signal">
                <Plus className="size-4" aria-hidden="true" />
                Add
              </button>
            </form>
          )}
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {crew.members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-sm font-bold uppercase">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    (m.display_name || m.username).slice(0, 1)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.display_name || m.username}
                    {m.role === "owner" && <Crown className="ml-1.5 inline size-3.5 text-neon-amber" aria-label="Crew owner" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">@{m.username}</span>
                </span>
                {isOwner && m.role !== "owner" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Remove @${m.username} from the crew?`)) run(() => removeCrewMemberAction(m.user_id), "Removed");
                    }}
                    className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${m.username}`}
                  >
                    <UserMinus className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        {!isOwner && me && (
          <div className="panel p-5">
            <p className="label-tech">You</p>
            <p className="mt-2 text-sm text-foreground/80">You are a member of {crew.name}. Your public builds show the crew badge.</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Leave ${crew.name}?`)) run(() => removeCrewMemberAction(userId), "You left the crew");
              }}
              className="btn-ghost btn-small mt-4"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Leave crew
            </button>
          </div>
        )}
        {isOwner && (
          <div className="panel p-5">
            <p className="label-tech">Danger zone</p>
            <p className="mt-2 text-sm text-muted-foreground">Deleting the crew removes every member and the crew page. Builds are untouched.</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Delete ${crew.name}? This cannot be undone.`)) run(() => deleteCrewAction(), "Crew deleted");
              }}
              className="btn-ghost btn-small mt-4 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete crew
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

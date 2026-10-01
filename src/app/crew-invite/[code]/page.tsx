import type { Metadata } from "next";
import Link from "next/link";

import { getOptionalUser } from "@/lib/supabase/server";
import { anonClient } from "@/lib/db/public";
import { PublicShell } from "@/components/layout/public-shell";
import { JoinCrewForm } from "@/components/crew/join-crew-form";

export const metadata: Metadata = { title: "Crew invite", robots: { index: false } };

interface InvitePreview {
  name: string;
  slug: string;
  tagline: string;
  owner_username: string | null;
  member_count: number;
  full: boolean;
  already_member: boolean;
  in_other_crew: boolean;
}

/** Landing page for a crew invite link: who is inviting, and one button to join. */
export default async function CrewInvitePage({ params }: PageProps<"/crew-invite/[code]">) {
  const { code: raw } = await params;
  const code = raw.trim().toUpperCase().slice(0, 20);
  const ctx = await getOptionalUser();
  const { data } = await (ctx?.client ?? anonClient()).rpc("crew_invite_preview", { p_code: code });
  const invite = (data as InvitePreview | null) ?? null;
  const next = encodeURIComponent(`/crew-invite/${code}`);

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-xl px-4 py-14 sm:px-6 md:py-20">
        {!invite ? (
          <>
            <p className="eyebrow">Crew invite</p>
            <h1 className="mt-3 text-4xl sm:text-5xl">This link isn&apos;t active.</h1>
            <p className="mt-4 text-foreground/75">The crew owner may have made a new invite link. Ask them to send you the current one.</p>
            <Link href="/crews" className="btn-ghost mt-8">
              Browse crews
            </Link>
          </>
        ) : (
          <>
            <p className="eyebrow">You&apos;re invited</p>
            <h1 className="mt-3 text-4xl leading-[0.95] sm:text-5xl">
              Join <span className="text-signal">{invite.name}</span>
            </h1>
            {invite.tagline && <p className="mt-3 text-foreground/80">{invite.tagline}</p>}
            <dl className="mt-6 grid grid-cols-2 border-t-2 border-foreground/20">
              <div className="py-4 pr-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Members</dt>
                <dd className="mt-1 font-display text-3xl leading-none font-bold tabular-nums">{invite.member_count} / 25</dd>
              </div>
              <div className="border-l border-line py-4 pl-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Crew owner</dt>
                <dd className="mt-1 truncate font-display text-xl leading-none font-bold">{invite.owner_username ? `@${invite.owner_username}` : "BuildTags"}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">Joining is free. Your public builds show up on the crew page and get the crew badge. You can leave any time.</p>

            <div className="mt-8">
              {invite.already_member ? (
                <>
                  <p className="text-sm">You&apos;re already in this crew.</p>
                  <Link href="/dashboard/crew" className="btn-signal mt-4">
                    Open your crew
                  </Link>
                </>
              ) : invite.full ? (
                <p className="rounded-md border border-line p-4 text-sm">This crew is full right now (25 members).</p>
              ) : invite.in_other_crew ? (
                <>
                  <p className="rounded-md border border-line p-4 text-sm">You&apos;re already in another crew, and it&apos;s one crew at a time. Leave your current crew first, then open this link again.</p>
                  <Link href="/dashboard/crew" className="btn-ghost mt-4">
                    Go to your crew
                  </Link>
                </>
              ) : ctx ? (
                <JoinCrewForm code={code} crewName={invite.name} />
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href={`/signup?next=${next}`} className="btn-signal" data-event="signup_started">
                      Create a free account
                    </Link>
                    <Link href={`/login?next=${next}`} className="btn-ghost">
                      I have an account
                    </Link>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">After you sign up and confirm your email, you&apos;ll land back here to join.</p>
                </>
              )}
            </div>

            <p className="mt-10 text-sm">
              <Link href={`/crew/${invite.slug}`} className="underline underline-offset-4 hover:text-signal">
                See the crew page
              </Link>
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CLAIM_ERROR_MESSAGE } from "@/lib/claims";
import type { ClaimPreview, ProfileRow } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";
import { ClaimFlow } from "@/components/claim/claim-flow";
import { ClaimSummary } from "@/components/claim/claim-summary";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

// The token is a secret: never index, never leak it through the Referer header.
export const metadata: Metadata = {
  title: "Claim your build",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function ClaimTokenPage({
  params,
}: PageProps<"/claim/[token]">) {
  const { token } = await params;
  const client = await createServerSupabaseClient();
  const valid = /^[A-Za-z0-9_-]{32,64}$/.test(token);
  const [{ data }, { data: userData }] = await Promise.all([
    valid
      ? client.rpc("claim_preview", { p_token: token })
      : Promise.resolve({ data: { status: "invalid" } }),
    client.auth.getUser(),
  ]);
  const preview = (data ?? { status: "invalid" }) as unknown as ClaimPreview;
  const user = userData.user;
  let username: string | null = null;
  if (user) {
    const { data: profile } = await client.rpc("ensure_profile");
    username = (profile as ProfileRow | null)?.username ?? null;
  }
  const next = `/claim/${token}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 md:py-14 lg:px-10">
        {preview.status !== "active" || !preview.vehicle ? (
          <ClaimProblem status={preview.status} />
        ) : (
          (() => {
            const v = preview.vehicle;
            const org = preview.organization ?? null;
            const title = vehicleTitle(v);
            const summary = <ClaimSummary vehicle={v} organization={org} />;

            if (!user || !username) {
              return (
                <>
                  {summary}
                  <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/signup?next=${encodeURIComponent(next)}`}
                      className="btn-signal sm:px-10"
                    >
                      Create free account to claim
                    </Link>
                    <Link
                      href={`/login?next=${encodeURIComponent(next)}`}
                      className="btn-ghost"
                    >
                      I have an account
                    </Link>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Claiming is free. Keep this link private until you&apos;ve
                    claimed it.
                  </p>
                </>
              );
            }
            return (
              <ClaimFlow
                token={token}
                vehicleLabel={v.nickname || title}
                orgName={org?.name ?? null}
                username={username}
              >
                {summary}
              </ClaimFlow>
            );
          })()
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function ClaimProblem({ status }: { status: ClaimPreview["status"] }) {
  const message =
    status === "claimed"
      ? CLAIM_ERROR_MESSAGE.claimed
      : status === "expired"
        ? CLAIM_ERROR_MESSAGE.expired
        : status === "revoked"
          ? CLAIM_ERROR_MESSAGE.revoked
          : CLAIM_ERROR_MESSAGE.invalid;
  return (
    <div className="max-w-xl">
      <p className="eyebrow">Claim link</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">
        {status === "claimed" ? "Already claimed" : "This link isn't active"}
      </h1>
      <p className="mt-4 text-foreground/85">{message}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {status === "claimed" ? (
          <Link href="/dashboard" className="btn-signal">
            Go to my garage
          </Link>
        ) : (
          <Link href="/claim" className="btn-signal">
            Enter a claim code
          </Link>
        )}
      </div>
    </div>
  );
}

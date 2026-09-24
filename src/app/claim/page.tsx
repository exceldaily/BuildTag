import type { Metadata } from "next";
import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";
import { ClaimFlow } from "@/components/claim/claim-flow";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Claim your build",
  description: "Got a BuildTag claim card from your shop or dealer? Enter the code to move the build into your garage.",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function ClaimCodePage() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  let username: string | null = null;
  if (user) {
    const { data: profile } = await client.rpc("ensure_profile");
    username = (profile as ProfileRow | null)?.username ?? null;
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 md:py-14 lg:px-10">
        <p className="eyebrow">Claim card</p>
        <h1 className="mt-3 text-5xl leading-[0.9] sm:text-6xl">
          <span className="speed-heading">Claim your build</span>
        </h1>
        <p className="mt-4 max-w-xl text-foreground/85">
          Your shop or dealer set up a build page for your vehicle. Enter the code from the claim card (it looks like BT-XXXX-XXXX) and the
          build moves into your garage. The QR on the vehicle stays the same.
        </p>
        {user && username ? (
          <ClaimFlow username={username} />
        ) : (
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Link href={`/signup?next=${encodeURIComponent("/claim")}`} className="btn-signal sm:px-10">
              Create free account
            </Link>
            <Link href={`/login?next=${encodeURIComponent("/claim")}`} className="btn-ghost">
              Sign in to claim
            </Link>
          </div>
        )}
        <p className="mt-6 max-w-xl text-xs text-muted-foreground">
          The QR code on a vehicle only opens its public page. It never gives anyone ownership. Only the private claim link or code from the
          business can do that.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getLocale } from "@/lib/i18n/server";
import { regionFromLocaleTag } from "@/lib/i18n";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "Create your build", robots: { index: false } };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const plan = sp.plan === "pro" ? "pro" : undefined;
  const [locale, h] = await Promise.all([getLocale(), headers()]);
  const region = regionFromLocaleTag(h.get("accept-language")?.split(",")[0]);
  return (
    <AuthShell
      title="Create your build"
      subtitle={plan === "pro" ? "Create your account first. Pro checkout ($5 a month or $50 a year) is the next step." : "Free to start. One vehicle, a permanent BuildTag, and a print-ready decal."}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm plan={plan} defaultLocale={locale} defaultRegion={region} />
    </AuthShell>
  );
}

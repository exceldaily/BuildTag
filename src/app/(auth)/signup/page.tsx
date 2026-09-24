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
  const nextRaw = typeof sp.next === "string" ? sp.next : "";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : undefined;
  const claiming = next?.startsWith("/claim") ?? false;
  const [locale, h] = await Promise.all([getLocale(), headers()]);
  const region = regionFromLocaleTag(h.get("accept-language")?.split(",")[0]);
  return (
    <AuthShell
      title={claiming ? "Claim your build" : "Create your build"}
      subtitle={claiming ? "Create your free account and the build your shop set up moves into your garage." : plan === "pro" ? "Create your account first. Pro checkout ($5 a month or $50 a year) is the next step." : "Free to start. Your first vehicle, its build page and a permanent BuildTag QR. Order the physical tag when you are ready."}
      footer={
        <>
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-foreground underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm plan={plan} next={next} defaultLocale={locale} defaultRegion={region} />
    </AuthShell>
  );
}

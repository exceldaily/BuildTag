import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create your build", robots: { index: false } };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const plan = sp.plan === "pro" ? "pro" : undefined;
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
      <SignupForm plan={plan} />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create your build", robots: { index: false } };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your build"
      subtitle="Free to start. One vehicle, a permanent BuildTag, and a print-ready decal."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a link to get back in."
      footer={
        <Link href="/login" className="text-foreground underline">
          Back to sign in
        </Link>
      }
    >
      <ResetForm />
    </AuthShell>
  );
}

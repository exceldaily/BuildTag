import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const nextRaw = typeof sp.next === "string" ? sp.next : "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  const checkEmail = sp.check_email === "1";
  const authError = sp.error === "auth";
  const deleted = sp.deleted === "1";
  const banned = sp.banned === "1";

  return (
    <AuthShell
      title="Sign in"
      subtitle="Back to the garage."
      footer={
        <>
          New here?{" "}
          <Link href={next === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`} className="text-foreground underline">
            Create your build
          </Link>
        </>
      }
    >
      {banned && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          This account has been suspended. Contact us if you think this is a mistake.
        </p>
      )}
      {deleted && (
        <p className="mb-4 rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-sm" role="status">
          Your account has been deleted.
        </p>
      )}
      {checkEmail && (
        <p className="mb-4 rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-sm">
          Check your inbox to confirm your email, then sign in.
        </p>
      )}
      {authError && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          That sign-in link is invalid or expired. Sign in again or request a new link.
        </p>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}

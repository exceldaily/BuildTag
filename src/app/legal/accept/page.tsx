import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { acceptCurrentPoliciesAction } from "@/lib/actions/legal";
import { LEGAL_DOCS } from "@/lib/legal/config";
import { getLegalStatus } from "@/lib/legal/status";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review our terms", robots: { index: false } };

export default async function AcceptPoliciesPage({ searchParams }: PageProps<"/legal/accept">) {
  const sp = await searchParams;
  const nextRaw = typeof sp.next === "string" ? sp.next : "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  const { client } = await requireUser(`/legal/accept?next=${encodeURIComponent(next)}`);
  const status = await getLegalStatus(client);
  if (status.current) redirect(next);

  const updated = Boolean(status.terms || status.privacy);
  const error = sp.error === "required" ? "Please tick the box to continue." : sp.error === "save" ? "We could not save that. Please try again." : null;

  return (
    <AuthShell
      title={updated ? "We updated our terms" : "Review our terms"}
      subtitle={
        updated
          ? "Please review the updated Terms of Service and Privacy Policy to keep using your account."
          : "Before you continue, please review and accept our Terms of Service and Privacy Policy."
      }
      footer={
        <Link href="/" className="underline">
          Back to home
        </Link>
      }
    >
      <form action={acceptCurrentPoliciesAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <ul className="space-y-1 text-sm">
          <li>
            <a href="/terms" target="_blank" rel="noopener" className="underline underline-offset-2">
              {LEGAL_DOCS.terms.title}
            </a>{" "}
            <span className="text-muted-foreground">updated {LEGAL_DOCS.terms.updated}</span>
          </li>
          <li>
            <a href="/privacy" target="_blank" rel="noopener" className="underline underline-offset-2">
              {LEGAL_DOCS.privacy.title}
            </a>{" "}
            <span className="text-muted-foreground">updated {LEGAL_DOCS.privacy.updated}</span>
          </li>
        </ul>
        <label htmlFor="accept_terms" className="flex cursor-pointer items-start gap-3 rounded-sm border border-line p-3 text-sm leading-relaxed text-foreground/85">
          <input id="accept_terms" name="accept_terms" type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-[var(--signal)]" />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener" className="text-foreground underline underline-offset-2">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener" className="text-foreground underline underline-offset-2">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-signal w-full">
          Continue
        </button>
      </form>
    </AuthShell>
  );
}

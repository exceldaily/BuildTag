import Link from "next/link";

import { Wordmark } from "@/components/layout/logo";

/** Centered card layout for sign in / sign up / reset. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex" aria-label="BuildTag home">
          <Wordmark className="h-10" />
        </Link>
        <h1 className="text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="panel mt-6 p-5">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}

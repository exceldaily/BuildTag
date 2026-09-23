"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Wordmark } from "@/components/layout/logo";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Link href="/" className="inline-flex" aria-label="BuildTag home">
        <Wordmark className="h-10" />
      </Link>
      <p className="eyebrow mt-10">ERROR</p>
      <h1 className="mt-3 text-4xl">Something misfired</h1>
      <p className="mt-4 max-w-sm text-muted-foreground">
        We hit a problem loading this page. It has been logged. Try again, or head back to the garage.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn-signal">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Home
        </Link>
      </div>
    </main>
  );
}

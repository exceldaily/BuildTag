import Link from "next/link";

import { LogoMark } from "./logo";

interface StatusPageProps {
  code: string;
  title: string;
  description: string;
  actions?: { href: string; label: string; primary?: boolean }[];
  children?: React.ReactNode;
}

/** Shared layout for 404 / private / disabled / invalid-QR / error states. */
export function StatusPage({ code, title, description, actions = [], children }: StatusPageProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground" aria-label="BuildTag home">
          <LogoMark />
          <span className="font-display text-lg font-bold tracking-[0.08em] uppercase">
            Build<span className="text-signal">Tag</span>
          </span>
        </Link>
        <p className="eyebrow mt-10">{code}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-sm text-base text-muted-foreground">{description}</p>
        {children}
        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {actions.map((a) => (
              <Link key={a.href} href={a.href} className={a.primary === false ? "btn-ghost" : "btn-signal"}>
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

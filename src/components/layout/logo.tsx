import Link from "next/link";

import { cn } from "@/lib/utils";

/** Wordmark: a QR-corner mark plus condensed uppercase type. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" />
      <rect x="18" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="22" y="6" width="4" height="4" fill="currentColor" />
      <rect x="2" y="18" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="6" y="22" width="4" height="4" fill="currentColor" />
      <rect x="18" y="18" width="5" height="5" fill="#ff2d7a" />
      <rect x="25" y="18" width="5" height="5" fill="currentColor" />
      <rect x="18" y="25" width="5" height="5" fill="currentColor" />
      <rect x="25" y="25" width="5" height="5" fill="#ff2d7a" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-foreground", className)} aria-label="BuildTag home">
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-[0.08em] uppercase">
        Build<span className="text-signal">Tag</span>
      </span>
    </Link>
  );
}

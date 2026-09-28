import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Brand assets. The wordmark is the supplied BuildTags brush lettering,
 * traced to a single-path SVG in /public/brand by scripts/trace-logos.mjs.
 * The mark is a compact QR-corner glyph for favicons and tight spots.
 */

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

/** The wordmark image, white on dark with a soft magenta glow. */
export function Wordmark({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-white.svg"
      alt="BuildTags"
      className={cn("h-9 w-auto select-none", glow && "drop-shadow-[0_0_14px_rgba(255,45,122,0.45)]", className)}
      draggable={false}
    />
  );
}

export function Logo({ className, href = "/", size = "md" }: { className?: string; href?: string; size?: "sm" | "md" | "lg" }) {
  const h = size === "sm" ? "h-7" : size === "lg" ? "h-14 sm:h-16" : "h-9 sm:h-10";
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="BuildTags home">
      <Wordmark className={h} />
    </Link>
  );
}

import { BadgeCheck } from "lucide-react";

/**
 * "Verified business" badge that explains exactly what was verified. Uses the
 * native Popover API (tap or click, keyboard accessible, no JavaScript), and
 * renders only phrasing content so it can sit inside a heading or paragraph.
 */
export function VerifiedBadge({ id, label, explainer, className = "size-4" }: { id: string; label: string; explainer: string; className?: string }) {
  const popId = `verified-${id}`;
  return (
    <>
      <button
        type="button"
        popoverTarget={popId}
        className="inline-flex shrink-0 cursor-help items-center rounded-sm text-neon-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        aria-label={`${label}: what this means`}
        title={explainer}
      >
        <BadgeCheck className={className} aria-hidden="true" />
      </button>
      <span
        id={popId}
        popover="auto"
        role="note"
        className="m-auto max-w-xs rounded-sm border border-line bg-surface p-4 text-left font-sans text-sm leading-relaxed font-normal tracking-normal text-foreground/90 normal-case not-italic shadow-2xl backdrop:bg-black/50"
      >
        <span className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
          <BadgeCheck className="size-4 text-neon-cyan" aria-hidden="true" />
          {label}
        </span>
        {explainer}
      </span>
    </>
  );
}

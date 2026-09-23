import type { SocialPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Recognizable brand glyphs, drawn inline so no icon font is needed. */
export function SocialIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  const c = cn("shrink-0", className);
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden="true">
          <path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.1c-1.5 0-2.9-.5-4-1.3V15a5.5 5.5 0 1 1-5.5-5.5c.3 0 .7 0 1 .1v3.2a2.4 2.4 0 1 0 1.4 2.2V3h3.1z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden="true">
          <path d="M22 8.2c-.2-1.4-.9-2.3-2.3-2.5C17.6 5.4 12 5.4 12 5.4s-5.6 0-7.7.3C2.9 5.9 2.2 6.8 2 8.2 1.8 9.6 1.8 12 1.8 12s0 2.4.2 3.8c.2 1.4.9 2.3 2.3 2.5 2.1.3 7.7.3 7.7.3s5.6 0 7.7-.3c1.4-.2 2.1-1.1 2.3-2.5.2-1.4.2-3.8.2-3.8s0-2.4-.2-3.8zM10 15V9l5.2 3L10 15z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden="true">
          <path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.5V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden="true">
          <path d="M17.5 3h3l-7.1 8.1L21.7 21h-6.5l-4.6-6-5.3 6h-3l7.6-8.7L2 3h6.6l4.2 5.5L17.5 3zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5z" />
        </svg>
      );
    case "threads":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 21c-4.5 0-7.5-3.2-7.5-9S7.5 3 12 3c3.5 0 6 1.8 6.8 4.6" />
          <path d="M8.5 14.5c0 1.8 1.5 3 3.5 3 2.8 0 4.5-1.6 4.5-4.5 0-3-1.8-5-4.7-5-1.6 0-2.9.8-3.5 2" />
          <path d="M9.5 12.8c1-.9 2.5-1.2 4.5-.8" />
        </svg>
      );
    case "twitch":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden="true">
          <path d="M4 3L3 6v13h5v3h3l3-3h4l5-5V3H4zm17 10l-3 3h-5l-3 3v-3H6V5h15v8zM15 8h2v5h-2V8zm-5 0h2v5h-2V8z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden="true">
          <path d="M19.5 5.5A16 16 0 0 0 15.6 4l-.5 1a15 15 0 0 0-6.2 0l-.5-1a16 16 0 0 0-3.9 1.5C2 9.3 1.4 13 1.7 16.7A16 16 0 0 0 6.5 19l1-1.6c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.5 11.5 0 0 0 11.4 0l.4.3c-.5.3-1 .6-1.6.8l1 1.6a16 16 0 0 0 4.8-2.3c.4-4.3-.7-8-2.8-11.2zM8.7 14.5c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2zm6.6 0c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
        </svg>
      );
  }
}

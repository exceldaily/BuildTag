import type { DeviceType } from "@/lib/types";

/** Coarse device class from a user agent string. Nothing else is derived. */
export function classifyDevice(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return "other";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";
  return "other";
}

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|fetch|curl|wget|headless/i.test(userAgent);
}

/** Referrer host only (privacy: never the full URL). */
export function referrerHost(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return null;
  }
}

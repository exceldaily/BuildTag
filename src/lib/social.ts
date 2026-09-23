import type { SocialPlatform } from "@/lib/types";

/** Display handle: "@ghost_supra" for handle platforms, hostname for sites. */
export function displayHandle(platform: SocialPlatform, handle: string, url: string): string {
  if (handle) {
    if (platform === "website" || platform === "other" || platform === "discord") return handle;
    return `@${handle.replace(/^@/, "")}`;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Brand colors used for social buttons on the public page. */
export const SOCIAL_COLORS: Record<SocialPlatform, string> = {
  instagram: "#E1306C",
  tiktok: "#69C9D0",
  youtube: "#FF0000",
  facebook: "#1877F2",
  x: "#FFFFFF",
  threads: "#FFFFFF",
  twitch: "#9146FF",
  discord: "#5865F2",
  website: "#A3A3A3",
  other: "#A3A3A3",
};

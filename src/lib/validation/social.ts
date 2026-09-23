import { z } from "zod";

import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/types";

import { checkbox, safeUrl } from "./common";

export const SOCIAL_PLATFORM_VALUES = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "threads",
  "twitch",
  "discord",
  "website",
  "other",
] as const;

const handleSchema = z
  .string()
  .trim()
  .max(80)
  .transform((h) => h.replace(/^@+/, ""));

/**
 * A social link is either a handle on a platform with a known URL pattern, or
 * an explicit https URL. The stored URL is always https.
 */
export const socialLinkSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORM_VALUES),
    handle: handleSchema.optional().default(""),
    url: z.union([z.literal(""), safeUrl]).optional().default(""),
    is_public: checkbox.default(true),
  })
  .transform((data, ctx) => {
    const platform = SOCIAL_PLATFORMS.find((p) => p.value === data.platform)!;
    let url = data.url;
    let handle = data.handle;

    if (!url && platform.base && handle) {
      if (!/^[A-Za-z0-9._-]{1,60}$/.test(handle)) {
        ctx.addIssue({ code: "custom", path: ["handle"], message: "Handle contains invalid characters" });
        return z.NEVER;
      }
      url = `${platform.base}${handle}`;
    }

    if (!url) {
      ctx.addIssue({
        code: "custom",
        path: platform.base ? ["handle"] : ["url"],
        message: platform.base ? "Enter a handle" : "Enter a full https:// URL",
      });
      return z.NEVER;
    }

    if (!url.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Links must use https://" });
      return z.NEVER;
    }

    if (!handle) {
      handle = deriveHandle(data.platform, url);
    }

    return { platform: data.platform, handle, url, is_public: data.is_public };
  });

export type SocialLinkInput = z.infer<typeof socialLinkSchema>;

export function deriveHandle(platform: SocialPlatform, url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    if (platform === "website" || platform === "other" || platform === "discord") {
      return u.hostname.replace(/^www\./, "");
    }
    return last.replace(/^@/, "");
  } catch {
    return "";
  }
}

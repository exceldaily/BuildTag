import type { TemplateId } from "@/lib/tag/types";

/**
 * Pure homepage configuration (no server imports) so tests can verify that
 * every QR the homepage renders really decodes.
 */

export type LandingBuildKey = "car" | "bagger" | "sportbike" | "shopBuild";

/** Permanent codes of the demo builds, used only if a live lookup fails. */
export const FALLBACK_CODES: Record<LandingBuildKey, string> = {
  car: "GHS7K2P9",
  bagger: "DSK7GR4X",
  sportbike: "RSSV2K7P",
  shopBuild: "BLK7RGX4",
};

export const HERO_TEMPLATE: TemplateId = "power";
export const REVEAL_TEMPLATE: TemplateId = "track";

/** Real template, real build, real permanent code for each designer tile. */
export const DESIGNER_TILES: { template: TemplateId; name: string; build: LandingBuildKey }[] = [
  { template: "minimalqr", name: "Minimal QR", build: "car" },
  { template: "power", name: "Power", build: "bagger" },
  { template: "jdm", name: "JDM", build: "car" },
  { template: "muscle", name: "Muscle", build: "bagger" },
  { template: "track", name: "Track", build: "bagger" },
  { template: "oem", name: "OEM+", build: "shopBuild" },
  { template: "offroad", name: "Off-Road", build: "car" },
  { template: "social", name: "Social", build: "sportbike" },
];

/** Homepage QR origin: production keeps its own; dev and previews encode the live site. */
export function landingOrigin(site: string): string {
  return /localhost|127\.0\.0\.1|\.vercel\.app/.test(site) ? "https://buildtags.app" : site.replace(/\/+$/, "");
}

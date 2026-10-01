import type { TagConfig } from "./types";

/**
 * Wording rules for a BuildTag.
 *
 * Every plan can take lines off the tag and swap in ready-made wording
 * (headline presets, call-to-action presets, the sample extra lines below).
 * Typing your own words (custom headline, custom call to action, free-text
 * extra line) is a Pro feature.
 */
export const SAMPLE_LINES = [
  "BUILT NOT BOUGHT",
  "DAILY DRIVEN",
  "STREET BUILD",
  "TRACK BUILD",
  "SHOW BUILD",
  "WORK IN PROGRESS",
  "TUNED",
  "BOOSTED",
  "STAGE 2",
  "E85",
  "ALL MOTOR",
  "LIFTED",
  "BAGGED",
  "FOLLOW THE BUILD",
] as const;

const SAMPLE_SET = new Set<string>(SAMPLE_LINES);

/** True when the extra line is one of the ready-made samples (or empty). */
export function isSampleLine(text: string): boolean {
  const t = text.trim();
  return t === "" || SAMPLE_SET.has(t);
}

/** True when the design uses wording only Pro can type. */
export function usesCustomWording(config: TagConfig): boolean {
  const t = config.text;
  if (t.headline === "custom" && t.headlineCustom.trim()) return true;
  if (t.cta === "custom" && t.ctaCustom.trim()) return true;
  return !isSampleLine(t.custom);
}

/** The same design with any typed-in wording removed (presets and samples stay). */
export function stripCustomWording(config: TagConfig): TagConfig {
  if (!usesCustomWording(config) && config.text.headline !== "custom" && config.text.cta !== "custom") return config;
  const t = config.text;
  return {
    ...config,
    text: {
      ...t,
      headline: t.headline === "custom" ? "none" : t.headline,
      headlineCustom: "",
      cta: t.cta === "custom" ? "scan" : t.cta,
      ctaCustom: "",
      custom: isSampleLine(t.custom) ? t.custom.trim() : "",
    },
  };
}

/**
 * App language + region.
 *
 * The language is chosen at sign-up (or on the profile page), stored on the
 * profile and mirrored in a cookie so public pages and the root <html lang>
 * follow it too. Strings live in ./dictionary.ts.
 */

export const LOCALES = ["en", "fr", "de", "es", "th"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  th: "ไทย",
};

/** Intl locale tags used for dates/numbers. */
export const LOCALE_TAG: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  th: "th-TH",
};

export const REGIONS = [
  { code: "US", label: "United States", units: "imperial" },
  { code: "CA", label: "Canada", units: "metric" },
  { code: "GB", label: "United Kingdom", units: "imperial" },
  { code: "EU", label: "Europe", units: "metric" },
  { code: "AU", label: "Australia / New Zealand", units: "metric" },
  { code: "TH", label: "Thailand", units: "metric" },
  { code: "ASIA", label: "Asia (other)", units: "metric" },
  { code: "LATAM", label: "Latin America", units: "metric" },
  { code: "OTHER", label: "Somewhere else", units: "metric" },
] as const;
export type RegionCode = (typeof REGIONS)[number]["code"];

export const LOCALE_COOKIE = "bt_locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function isRegion(v: unknown): v is RegionCode {
  return typeof v === "string" && REGIONS.some((r) => r.code === v);
}

/** Best locale from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return "en";
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0].toLowerCase();
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

/** Suggested region from a locale/country hint. */
export function regionFromLocaleTag(tag: string | null | undefined): RegionCode {
  const country = (tag ?? "").split("-")[1]?.toUpperCase();
  if (!country) return "US";
  if (country === "US") return "US";
  if (country === "CA") return "CA";
  if (country === "GB" || country === "IE") return "GB";
  if (country === "AU" || country === "NZ") return "AU";
  if (country === "TH") return "TH";
  if (["FR", "DE", "ES", "IT", "NL", "BE", "AT", "CH", "PT", "SE", "NO", "DK", "FI", "PL", "CZ"].includes(country)) return "EU";
  if (["MX", "BR", "AR", "CL", "CO", "PE"].includes(country)) return "LATAM";
  if (["JP", "KR", "SG", "MY", "ID", "PH", "VN", "TW", "HK", "CN", "IN"].includes(country)) return "ASIA";
  return "OTHER";
}

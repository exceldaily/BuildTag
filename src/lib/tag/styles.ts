import type { StyleId, TagColors } from "./types";

/**
 * Fonts are system font stacks on purpose: exported SVG/PNG must render the
 * same in a print shop's software as in the browser preview, and embedded web
 * fonts cannot be relied on inside downloaded artwork.
 */
export const FONT_HEAVY = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
export const FONT_IMPACT = "Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif";
export const FONT_CLEAN = "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const FONT_MONO = "'Courier New', Courier, monospace";

export interface StyleDefinition {
  id: StyleId;
  name: string;
  description: string;
  colors: TagColors;
  displayFont: string;
  bodyFont: string;
  /** Average glyph width relative to font size (for fitting). */
  displayFactor: number;
  bodyFactor: number;
  letterSpacing: number;
  uppercase: boolean;
  /** Decorative treatment drawn behind content (never over the QR). */
  decoration: "none" | "stripes" | "grid" | "carbon" | "sun" | "checker" | "rugged" | "bevel" | "lines";
  /** Border stroke width in layout units (0 = none). */
  border: number;
  borderColor?: string;
  /** Free (pro) tier gate. Premium styles are still previewable. */
  pro: boolean;
}

export const STYLES: Record<StyleId, StyleDefinition> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Clean black and white.",
    colors: { background: "#FFFFFF", foreground: "#0A0A0A", accent: "#0A0A0A", qrDark: "#000000", qrLight: "#FFFFFF" },
    displayFont: FONT_HEAVY,
    bodyFont: FONT_CLEAN,
    displayFactor: 0.68,
    bodyFactor: 0.56,
    letterSpacing: 0.06,
    uppercase: true,
    decoration: "none",
    border: 0,
    pro: false,
  },
  oem: {
    id: "oem",
    name: "OEM+",
    description: "Looks like a factory performance badge.",
    colors: { background: "#1C1C1E", foreground: "#E8E8E8", accent: "#B8B8B8", qrDark: "#000000", qrLight: "#FFFFFF" },
    displayFont: FONT_CLEAN,
    bodyFont: FONT_CLEAN,
    displayFactor: 0.6,
    bodyFactor: 0.56,
    letterSpacing: 0.14,
    uppercase: true,
    decoration: "bevel",
    border: 10,
    borderColor: "#B8B8B8",
    pro: false,
  },
  jdm: {
    id: "jdm",
    name: "JDM",
    description: "Japanese tuner typography, red accents.",
    colors: { background: "#FFFFFF", foreground: "#111111", accent: "#D40000", qrDark: "#000000", qrLight: "#FFFFFF" },
    displayFont: FONT_HEAVY,
    bodyFont: FONT_CLEAN,
    displayFactor: 0.68,
    bodyFactor: 0.56,
    letterSpacing: 0.02,
    uppercase: true,
    decoration: "sun",
    border: 0,
    pro: true,
  },
  euro: {
    id: "euro",
    name: "Euro",
    description: "Clean European performance aesthetic.",
    colors: { background: "#0B1220", foreground: "#F4F4F5", accent: "#3B82F6", qrDark: "#0B1220", qrLight: "#FFFFFF" },
    displayFont: FONT_CLEAN,
    bodyFont: FONT_CLEAN,
    displayFactor: 0.6,
    bodyFactor: 0.56,
    letterSpacing: 0.12,
    uppercase: true,
    decoration: "lines",
    border: 0,
    pro: true,
  },
  muscle: {
    id: "muscle",
    name: "Muscle",
    description: "Bold American performance with racing stripes.",
    colors: { background: "#0A0A0A", foreground: "#FFFFFF", accent: "#F59E0B", qrDark: "#000000", qrLight: "#FFFFFF" },
    displayFont: FONT_IMPACT,
    bodyFont: FONT_HEAVY,
    displayFactor: 0.5,
    bodyFactor: 0.66,
    letterSpacing: 0.03,
    uppercase: true,
    decoration: "stripes",
    border: 0,
    pro: true,
  },
  track: {
    id: "track",
    name: "Track",
    description: "Motorsport race-number aesthetic.",
    colors: { background: "#FFFFFF", foreground: "#000000", accent: "#FACC15", qrDark: "#000000", qrLight: "#FFFFFF" },
    displayFont: FONT_IMPACT,
    bodyFont: FONT_HEAVY,
    displayFactor: 0.5,
    bodyFactor: 0.66,
    letterSpacing: 0.02,
    uppercase: true,
    decoration: "checker",
    border: 14,
    borderColor: "#000000",
    pro: true,
  },
  offroad: {
    id: "offroad",
    name: "Off-Road",
    description: "Rugged utility design.",
    colors: { background: "#3F4A2E", foreground: "#EDE4CC", accent: "#C7A15A", qrDark: "#1F2416", qrLight: "#F3EEDD" },
    displayFont: FONT_HEAVY,
    bodyFont: FONT_CLEAN,
    displayFactor: 0.68,
    bodyFactor: 0.56,
    letterSpacing: 0.08,
    uppercase: true,
    decoration: "rugged",
    border: 12,
    borderColor: "#C7A15A",
    pro: true,
  },
  carbon: {
    id: "carbon",
    name: "Carbon",
    description: "Carbon-weave performance badge.",
    colors: { background: "#161616", foreground: "#FFFFFF", accent: "#E11D48", qrDark: "#000000", qrLight: "#FFFFFF" },
    displayFont: FONT_HEAVY,
    bodyFont: FONT_CLEAN,
    displayFactor: 0.68,
    bodyFactor: 0.56,
    letterSpacing: 0.08,
    uppercase: true,
    decoration: "carbon",
    border: 8,
    borderColor: "#2A2A2A",
    pro: true,
  },
  tech: {
    id: "tech",
    name: "Tech",
    description: "Blueprint specification sheet.",
    colors: { background: "#0F172A", foreground: "#BAE6FD", accent: "#38BDF8", qrDark: "#0F172A", qrLight: "#FFFFFF" },
    displayFont: FONT_MONO,
    bodyFont: FONT_MONO,
    displayFactor: 0.6,
    bodyFactor: 0.6,
    letterSpacing: 0.06,
    uppercase: true,
    decoration: "grid",
    border: 4,
    borderColor: "#38BDF8",
    pro: true,
  },
};

export const STYLE_LIST = Object.values(STYLES);

/** Safe QR color pairings offered as one-click defaults. */
export const SAFE_QR_PAIRS: { label: string; qrDark: string; qrLight: string }[] = [
  { label: "Black on white", qrDark: "#000000", qrLight: "#FFFFFF" },
  { label: "White on black", qrDark: "#FFFFFF", qrLight: "#000000" },
  { label: "Dark gray on white", qrDark: "#1F1F1F", qrLight: "#FFFFFF" },
];

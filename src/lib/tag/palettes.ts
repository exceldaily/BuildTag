import type { TagColors } from "./types";

/**
 * Automotive color presets. Names are generic (no manufacturer trademarks).
 * QR colors in every palette pass the contrast engine; decorative colors are
 * free to be louder.
 */
export interface Palette {
  id: string;
  name: string;
  colors: TagColors;
}

export const PALETTES: Palette[] = [
  { id: "stealth", name: "Stealth", colors: { background: "#0b0b0d", foreground: "#e6e6e6", accent: "#5a5a60", qrDark: "#000000", qrLight: "#ffffff" } },
  { id: "black-white", name: "Black / White", colors: { background: "#ffffff", foreground: "#0a0a0a", accent: "#0a0a0a", qrDark: "#000000", qrLight: "#ffffff" } },
  { id: "gunmetal", name: "Gunmetal", colors: { background: "#2b2f36", foreground: "#e8eaee", accent: "#9aa3ad", qrDark: "#0f1114", qrLight: "#f2f4f7" } },
  { id: "track", name: "Track", colors: { background: "#ffffff", foreground: "#000000", accent: "#facc15", qrDark: "#000000", qrLight: "#ffffff" } },
  { id: "racing-red", name: "Racing Red", colors: { background: "#161616", foreground: "#ffffff", accent: "#d81e2a", qrDark: "#000000", qrLight: "#ffffff" } },
  { id: "electric-blue", name: "Electric Blue", colors: { background: "#08101f", foreground: "#e6f1ff", accent: "#1fa2ff", qrDark: "#06101c", qrLight: "#ffffff" } },
  { id: "acid", name: "Acid", colors: { background: "#0f130b", foreground: "#f3ffe8", accent: "#a3e635", qrDark: "#0b0f07", qrLight: "#f7ffef" } },
  { id: "bronze", name: "Bronze", colors: { background: "#1c1712", foreground: "#f1e6d6", accent: "#b07a3b", qrDark: "#1a140f", qrLight: "#fbf5ec" } },
  { id: "silver", name: "Silver", colors: { background: "#d9dbe0", foreground: "#1b1c20", accent: "#6b6f78", qrDark: "#101114", qrLight: "#ffffff" } },
  { id: "whiteout", name: "Whiteout", colors: { background: "#ffffff", foreground: "#111111", accent: "#c4c4c4", qrDark: "#111111", qrLight: "#ffffff" } },
  { id: "neon", name: "Midnight Neon", colors: { background: "#06050d", foreground: "#f3f1ff", accent: "#ff2d7a", qrDark: "#000000", qrLight: "#ffffff" } },
  { id: "cyan", name: "Cyan Chrome", colors: { background: "#0b1220", foreground: "#e8fbff", accent: "#1fd8ff", qrDark: "#06101c", qrLight: "#ffffff" } },
];

export const PALETTE_BY_ID: Record<string, Palette> = Object.fromEntries(PALETTES.map((p) => [p.id, p]));

/** Safe QR color pairings offered as one-click defaults. */
export const SAFE_QR_PAIRS: { label: string; qrDark: string; qrLight: string }[] = [
  { label: "Black on white", qrDark: "#000000", qrLight: "#ffffff" },
  { label: "Dark gray on white", qrDark: "#1f1f1f", qrLight: "#ffffff" },
  { label: "Navy on white", qrDark: "#06101c", qrLight: "#ffffff" },
  { label: "White on black", qrDark: "#ffffff", qrLight: "#000000" },
];

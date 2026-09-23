import type { FontId } from "./types";

/**
 * Decal typography. Every family is an OFL-licensed font shipped in
 * /public/fonts (license text alongside). The preview uses them through
 * @font-face; production exports convert text to paths with the same files,
 * so nothing downstream depends on installed fonts.
 */
export interface FontDefinition {
  id: FontId;
  name: string;
  description: string;
  /** CSS family registered in globals.css. */
  family: string;
  /** Fallback stack for environments without the web font. */
  fallback: string;
  /** Path under /public. */
  file: string;
  /** Average glyph advance relative to font size, for fitting. */
  factor: number;
  uppercase: boolean;
  letterSpacing: number;
  /** Cap-height ratio used to vertically center text in slots. */
  capHeight: number;
}

export const FONTS: Record<FontId, FontDefinition> = {
  condensed: {
    id: "condensed",
    name: "Condensed",
    description: "Tight, tall performance type.",
    family: "BT Condensed",
    fallback: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
    file: "/fonts/BarlowCondensed-Bold.ttf",
    factor: 0.46,
    uppercase: true,
    letterSpacing: 0.04,
    capHeight: 0.7,
  },
  technical: {
    id: "technical",
    name: "Technical",
    description: "Squared engineering feel.",
    family: "BT Technical",
    fallback: "'Eurostile', 'Bank Gothic', Arial, sans-serif",
    file: "/fonts/Rajdhani-Bold.ttf",
    factor: 0.52,
    uppercase: true,
    letterSpacing: 0.08,
    capHeight: 0.68,
  },
  motorsport: {
    id: "motorsport",
    name: "Motorsport",
    description: "Slanted race-livery lettering.",
    family: "BT Motorsport",
    fallback: "Impact, 'Arial Black', sans-serif",
    file: "/fonts/RacingSansOne-Regular.ttf",
    factor: 0.55,
    uppercase: true,
    letterSpacing: 0.02,
    capHeight: 0.72,
  },
  heavy: {
    id: "heavy",
    name: "Heavy",
    description: "Big, loud, American.",
    family: "BT Heavy",
    fallback: "Impact, 'Arial Black', sans-serif",
    file: "/fonts/Anton-Regular.ttf",
    factor: 0.44,
    uppercase: true,
    letterSpacing: 0.03,
    capHeight: 0.74,
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Clean grotesque.",
    family: "BT Minimal",
    fallback: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    file: "/fonts/Barlow-Bold.ttf",
    factor: 0.6,
    uppercase: true,
    letterSpacing: 0.1,
    capHeight: 0.7,
  },
  industrial: {
    id: "industrial",
    name: "Industrial",
    description: "Stencil-like block capitals.",
    family: "BT Industrial",
    fallback: "'Arial Narrow', Impact, sans-serif",
    file: "/fonts/BebasNeue-Regular.ttf",
    factor: 0.42,
    uppercase: true,
    letterSpacing: 0.06,
    capHeight: 0.72,
  },
};

export const FONT_LIST = Object.values(FONTS);

export function fontFamilyCss(id: FontId): string {
  const f = FONTS[id] ?? FONTS.condensed;
  return `'${f.family}', ${f.fallback}`;
}

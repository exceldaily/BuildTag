import { FONTS } from "./fonts";
import { FONT_METRICS } from "./font-metrics";
import type { FontId, TextLine } from "./types";

/**
 * Exact text geometry from the shipped fonts' own metrics (font-metrics.ts),
 * matching what the production export draws with opentype.js: glyph advances
 * plus letter spacing after every glyph, the social icon before the text.
 * Everything is linear in the font size, so measuring at size 1 and scaling
 * is exact.
 */
export interface Ink {
  /** Pen advance of the whole run (what text-anchor centers on). */
  advance: number;
  /** Ink extent from the pen start: left may be negative (overhang), right. */
  left: number;
  right: number;
  /** Ink above the baseline (positive) and below it (positive). */
  top: number;
  bottom: number;
}

/** Keeps only characters the font has a glyph for (plus spaces), collapsing the gaps left behind. */
export function printable(font: FontId, text: string): string {
  const glyphs = (FONT_METRICS[font] ?? FONT_METRICS.condensed).glyphs;
  return [...text]
    .filter((ch) => ch === " " || ch in glyphs)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function measureRun(font: FontId, text: string, fontSize: number, letterSpacingEm: number): Ink {
  const m = FONT_METRICS[font] ?? FONT_METRICS.condensed;
  let x = 0;
  let left = Infinity;
  let right = -Infinity;
  let top = 0;
  let bottom = 0;
  for (const ch of text) {
    const [adv, x0, x1, y0, y1] = m.glyphs[ch] ?? m.fallback;
    if (x1 > x0) {
      left = Math.min(left, x + x0);
      right = Math.max(right, x + x1);
      top = Math.max(top, y1);
      bottom = Math.max(bottom, -y0);
    }
    x += adv + letterSpacingEm;
  }
  if (!Number.isFinite(left)) {
    left = 0;
    right = 0;
  }
  return { advance: x * fontSize, left: left * fontSize, right: right * fontSize, top: top * fontSize, bottom: bottom * fontSize };
}

/** Size of the social icon drawn before a handle, and the gap after it (as in render.ts). */
export const iconSizeFor = (font: FontId, fontSize: number) => fontSize * (FONTS[font] ?? FONTS.condensed).capHeight * 1.1;
export const ICON_ADVANCE = 1.25;

export interface LineInk {
  /** Ink extent relative to the line's anchor x. */
  x0: number;
  x1: number;
  /** Ink extent above/below the baseline (both positive). */
  top: number;
  bottom: number;
  /** Where the text run starts when an icon is drawn (render.ts places the icon at iconX). */
  iconX: number | null;
  textX: number;
}

/** Ink box of a whole line (icon + text) as render.ts draws it. */
export function lineInk(line: Pick<TextLine, "text" | "font" | "fontSize" | "letterSpacing" | "anchor" | "icon">): LineInk {
  const ls = line.fontSize ? line.letterSpacing / line.fontSize : 0;
  const run = measureRun(line.font, line.text, line.fontSize, ls);
  const icon = line.icon ? iconSizeFor(line.font, line.fontSize) : 0;
  const lead = icon ? icon * ICON_ADVANCE : 0;
  const total = lead + run.advance;
  const start = line.anchor === "middle" ? -total / 2 : line.anchor === "end" ? -total : 0;
  const textX = start + lead;
  return {
    x0: Math.min(icon ? start : Infinity, textX + run.left),
    x1: Math.max(icon ? start + icon : -Infinity, textX + run.right),
    top: Math.max(run.top, icon * 0.95),
    bottom: Math.max(run.bottom, icon * 0.05),
    iconX: icon ? start : null,
    textX,
  };
}

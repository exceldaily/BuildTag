/**
 * Contrast math for QR reliability checks. Uses WCAG relative luminance,
 * which tracks how phone camera decoders binarize a printed code well
 * enough for a go/no-go decision.
 */

export function parseHexColor(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Thresholds used by the designer. Below `block` the export is refused. */
export const QR_CONTRAST = {
  ideal: 10,
  warn: 6,
  block: 3.5,
} as const;

export type QrContrastVerdict = "ideal" | "acceptable" | "warning" | "blocked";

export function qrContrastVerdict(fg: string, bg: string): { ratio: number; verdict: QrContrastVerdict } {
  const ratio = contrastRatio(fg, bg);
  // Dark modules on a light background decode most reliably; inverted codes
  // scan on most phones but we flag them so the owner tests before printing.
  const inverted = relativeLuminance(fg) > relativeLuminance(bg);
  let verdict: QrContrastVerdict;
  if (ratio < QR_CONTRAST.block) verdict = "blocked";
  else if (ratio < QR_CONTRAST.warn) verdict = "warning";
  else if (ratio < QR_CONTRAST.ideal || inverted) verdict = "acceptable";
  else verdict = "ideal";
  return { ratio, verdict };
}

export function isDark(hex: string): boolean {
  return relativeLuminance(hex) < 0.35;
}

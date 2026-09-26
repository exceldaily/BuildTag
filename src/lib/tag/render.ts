import { createQrMatrix } from "@/lib/qr/generate";
import { renderQr } from "@/lib/qr/render";

import { backgroundDefs, backgroundSvg } from "./backgrounds";
import { BRAND_PATH, BRAND_VIEWBOX } from "./brand-path";
import { FONTS, fontFamilyCss } from "./fonts";
import { FRAMES } from "./frames";
import { socialGlyph } from "./icons";
import { layoutTag, type LayoutResult } from "./layout";
import { SHAPES } from "./shapes";
import { toInches } from "./sizes";
import type { TagConfig, TagData, TextLine } from "./types";

/**
 * Print geometry for exports. Values are in the decal's physical units
 * (inches). Mirrors buildtag.print_specifications.
 */
export interface PrintGeometry {
  bleedIn: number;
  safeMarginIn: number;
  cutPath: { layerName: string; stroke: string; strokeWidthPt: number };
}

export const DEFAULT_PRINT_GEOMETRY: PrintGeometry = {
  bleedIn: 0.125,
  safeMarginIn: 0.125,
  cutPath: { layerName: "CutContour", stroke: "#FF00FF", strokeWidthPt: 0.25 },
};

export interface RenderOptions {
  /** "preview" draws in the browser; "export" produces production artwork. */
  mode?: "preview" | "export";
  /** Draw safe-zone guides (preview only). */
  guides?: boolean;
  /** Include physical width/height attributes and bleed geometry. */
  physical?: boolean;
  geometry?: PrintGeometry;
  /** Convert every text line to a path (export). Returns null to fall back to <text>. */
  textToPath?: (line: TextLine) => string | null;
  /** Material treatment overlay (preview only). */
  material?: boolean;
  idPrefix?: string;
}

export interface RenderResult {
  svg: string;
  layout: LayoutResult;
  logoCoverage: number;
  /** viewBox origin/size in layout units, including bleed when exporting. */
  viewBox: { x: number; y: number; w: number; h: number };
}

export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function textElement(line: TextLine, idp: string, textToPath?: RenderOptions["textToPath"]): string {
  const font = FONTS[line.font] ?? FONTS.condensed;
  const parts: string[] = [];
  let x = line.x;
  if (line.icon) {
    const glyph = socialGlyph(line.icon);
    if (glyph) {
      const iconSize = line.fontSize * font.capHeight * 1.1;
      const textWidth = line.text.length * (font.factor + font.letterSpacing) * line.fontSize;
      const totalW = textWidth + iconSize * 1.25;
      const startX = line.anchor === "middle" ? line.x - totalW / 2 : line.anchor === "end" ? line.x - totalW : line.x;
      const iy = line.y - iconSize * 0.95;
      parts.push(`<g transform="translate(${startX.toFixed(1)} ${iy.toFixed(1)}) scale(${(iconSize / 24).toFixed(4)})"><path d="${glyph}" fill="${line.color}"/></g>`);
      x = startX + iconSize * 1.25;
      line = { ...line, x, anchor: "start" };
    }
  }
  const pathD = textToPath?.(line) ?? null;
  if (pathD) {
    parts.push(`<path d="${pathD}" fill="${line.color}"/>`);
  } else {
    parts.push(
      `<text x="${line.x.toFixed(1)}" y="${line.y.toFixed(1)}" font-family="${escapeXml(fontFamilyCss(line.font))}" font-size="${line.fontSize.toFixed(1)}" font-weight="700" letter-spacing="${line.letterSpacing.toFixed(2)}" text-anchor="${line.anchor}" fill="${line.color}" data-role="${line.role}" data-idp="${idp}">${escapeXml(line.text)}</text>`,
    );
  }
  return parts.join("");
}

function materialOverlay(kind: TagConfig["material"], w: number, h: number, idp: string): string {
  switch (kind) {
    case "gloss":
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-gloss)"/>`;
    case "matte":
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#000" opacity="0.06"/>`;
    case "reflective":
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-reflect)"/>`;
    case "holographic":
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-holo)" opacity="0.28"/>`;
    case "transparent":
    default:
      return "";
  }
}

/**
 * Renders the decal as an SVG string. The same function feeds the live
 * preview, the SVG download, the PNG rasterizer, the decoder test and the
 * production snapshot, so what the owner sees is what gets printed.
 */
export function renderTagSvg(config: TagConfig, data: TagData, options: RenderOptions = {}): RenderResult {
  const mode = options.mode ?? "preview";
  const idp = options.idPrefix ?? "bt";
  const layout = layoutTag(config, data);
  const shape = SHAPES[config.shape] ?? SHAPES.rounded;
  const frame = FRAMES[config.frame] ?? FRAMES.none;
  const { width: w, height: h } = layout;
  const colors = config.colors;
  const shapePath = shape.path(w, h);
  const inches = toInches(config.size);
  const unitsPerInch = w / inches.width;
  const geometry = options.geometry ?? DEFAULT_PRINT_GEOMETRY;
  const bleed = options.physical && mode === "export" ? geometry.bleedIn * unitsPerInch : 0;
  const safe = geometry.safeMarginIn * unitsPerInch;

  const viewBox = { x: -bleed, y: -bleed, w: w + bleed * 2, h: h + bleed * 2 };
  const physW = inches.width + (bleed ? geometry.bleedIn * 2 : 0);
  const physH = inches.height + (bleed ? geometry.bleedIn * 2 : 0);
  const sizeAttrs = options.physical ? `width="${physW.toFixed(4)}in" height="${physH.toFixed(4)}in"` : `width="100%" height="100%"`;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${sizeAttrs} viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}" role="img" aria-label="BuildTag decal">`);

  // defs
  parts.push(`<defs>`);
  parts.push(`<clipPath id="${idp}-clip"><path d="${shapePath}"/></clipPath>`);
  if (bleed) {
    const bw = w + bleed * 2;
    const bh = h + bleed * 2;
    parts.push(`<clipPath id="${idp}-bleed"><path d="${shape.path(bw, bh)}" transform="translate(${-bleed} ${-bleed})"/></clipPath>`);
  }
  parts.push(backgroundDefs(idp, colors, w));
  parts.push(`<linearGradient id="${idp}-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.04"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="0.75" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  parts.push(`<linearGradient id="${idp}-reflect" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.05"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff" stop-opacity="0.08"/></linearGradient>`);
  parts.push(`<linearGradient id="${idp}-holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5fd2"/><stop offset="0.25" stop-color="#ffd75f"/><stop offset="0.5" stop-color="#5fffb0"/><stop offset="0.75" stop-color="#5fb8ff"/><stop offset="1" stop-color="#c85fff"/></linearGradient>`);
  parts.push(`</defs>`);

  // Bleed: background extended beyond the cut line (export only).
  if (bleed) {
    parts.push(`<g id="${idp}-bleed-layer" clip-path="url(#${idp}-bleed)"><g transform="translate(${-bleed} ${-bleed})">${backgroundSvg(idp, config.background, colors, w + bleed * 2, h + bleed * 2, config.advanced.decorOpacity)}</g></g>`);
  }

  // Artwork clipped to the cut line.
  parts.push(`<g id="${idp}-artwork" clip-path="url(#${idp}-clip)">`);
  parts.push(backgroundSvg(idp, config.background, colors, w, h, config.advanced.decorOpacity));
  if (shape.decoration) parts.push(shape.decoration(w, h, colors.accent, colors.foreground, config.advanced.decorOpacity));

  let logoCoverage = 0;
  if (layout.qr) {
    const q = layout.qr;
    if (frame.id !== "none") {
      parts.push(frame.render(q.frameX, q.frameY, q.frameSize, { fg: colors.foreground, accent: colors.accent, bg: colors.background }));
    }
    const matrix = createQrMatrix(data.scanUrl);
    const qr = renderQr(matrix, {
      x: q.x,
      y: q.y,
      size: q.size,
      moduleStyle: config.qr.moduleStyle,
      finderStyle: config.qr.finderStyle,
      dark: colors.qrDark,
      light: colors.qrLight,
      logo: config.qr.logo,
    });
    parts.push(qr.svg);
    logoCoverage = qr.logoCoverage;
  }

  if (layout.logoBox) {
    const b = layout.logoBox;
    const s = b.w / BRAND_VIEWBOX.width;
    parts.push(`<g transform="translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${s.toFixed(5)})"><path d="${BRAND_PATH}" fill="${colors.accent}" fill-rule="evenodd"/></g>`);
  }

  for (const line of layout.lines) parts.push(textElement(line, idp, options.textToPath));

  if (config.advanced.border) {
    parts.push(`<path d="${shapePath}" fill="none" stroke="${colors.accent}" stroke-width="${(Math.min(w, h) * 0.012).toFixed(1)}" clip-path="url(#${idp}-clip)"/>`);
  }

  if (mode === "preview" && options.material !== false) parts.push(materialOverlay(config.material, w, h, idp));
  parts.push(`</g>`);

  // Cut path: a separate stroked layer printers can pick up by name.
  if (mode === "export" && options.physical) {
    const strokeUnits = (geometry.cutPath.strokeWidthPt / 72) * unitsPerInch;
    parts.push(`<g id="${escapeXml(geometry.cutPath.layerName)}" data-layer="cut"><path d="${shapePath}" fill="none" stroke="${geometry.cutPath.stroke}" stroke-width="${strokeUnits.toFixed(3)}"/></g>`);
  }

  // Guides (preview only, never exported).
  if (mode === "preview" && options.guides) {
    parts.push(`<g id="${idp}-guides" pointer-events="none">`);
    parts.push(`<path d="${shapePath}" fill="none" stroke="#22D3EE" stroke-width="3" stroke-dasharray="14 10"/>`);
    parts.push(`<path d="${shape.path(w - safe * 2, h - safe * 2)}" transform="translate(${safe} ${safe})" fill="none" stroke="#a3e635" stroke-width="2" stroke-dasharray="8 8" opacity="0.9"/>`);
    parts.push(`<rect x="${layout.contentRect.x}" y="${layout.contentRect.y}" width="${layout.contentRect.w}" height="${layout.contentRect.h}" fill="none" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.8"/>`);
    if (layout.qr) {
      const q = layout.qr;
      parts.push(`<rect x="${q.x}" y="${q.y}" width="${q.size}" height="${q.size}" fill="none" stroke="#F59E0B" stroke-width="3" stroke-dasharray="10 8"/>`);
    }
    if (bleed === 0) {
      const b = geometry.bleedIn * unitsPerInch;
      parts.push(`<path d="${shape.path(w + b * 2, h + b * 2)}" transform="translate(${-b} ${-b})" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="6 6" opacity="0.6"/>`);
    }
    parts.push(`</g>`);
  }

  parts.push(`</svg>`);
  return { svg: parts.join(""), layout, logoCoverage, viewBox };
}

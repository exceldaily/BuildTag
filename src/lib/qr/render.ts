import { BRAND_PATH, BRAND_VIEWBOX } from "@/lib/tag/brand-path";
import type { QrFinderStyle, QrLogoKind, QrModuleStyle } from "@/lib/tag/types";

import { QR_QUIET_ZONE_MODULES, type QrMatrix } from "./generate";

/**
 * Styled QR renderer. The matrix itself is never altered: every style only
 * changes how a dark module is drawn while keeping its center and the
 * 1:1:3:1:1 finder ratios scanners look for. Frames and logos live outside
 * or on top of a protected area whose size the safety engine bounds.
 */

export interface QrLogoOptions {
  kind: QrLogoKind;
  /** Public URL or data URI for uploaded/shop artwork. */
  url: string | null;
  /** Requested logo width as a fraction of the matrix side. Clamped. */
  scale: number;
}

export interface RenderQrOptions {
  x: number;
  y: number;
  /** Block size including the quiet zone. */
  size: number;
  moduleStyle: QrModuleStyle;
  finderStyle: QrFinderStyle;
  dark: string;
  light: string;
  logo?: QrLogoOptions;
  /** Plate corner radius as a fraction of the block size. */
  plateRadius?: number;
}

export interface RenderQrResult {
  svg: string;
  /** Fraction of the matrix area hidden by the logo plate (0 when no logo). */
  logoCoverage: number;
  logoBox: { x: number; y: number; w: number; h: number } | null;
}

/** Hard limits for the center logo (ECC H recovers 30%; keep well under). */
export const LOGO_MAX_SCALE = 0.24;
export const LOGO_MIN_SCALE = 0.12;
export const LOGO_PLATE_MARGIN_MODULES = 1;

function inFinder(size: number, r: number, c: number): boolean {
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

function modulePath(style: QrModuleStyle, x: number, y: number): string {
  switch (style) {
    case "soft":
      return roundedRectPath(x + 0.05, y + 0.05, 0.9, 0.9, 0.2);
    case "rounded":
      return roundedRectPath(x, y, 1, 1, 0.35);
    case "dots":
      return `M${fmt(x + 0.5)} ${fmt(y + 0.01)}a0.49 0.49 0 1 1 0 0.98a0.49 0.49 0 1 1 0 -0.98z`;
    case "diamond": {
      const c = 0.22;
      return `M${fmt(x + c)} ${fmt(y)}h${fmt(1 - 2 * c)}l${fmt(c)} ${fmt(c)}v${fmt(1 - 2 * c)}l${fmt(-c)} ${fmt(c)}h${fmt(-(1 - 2 * c))}l${fmt(-c)} ${fmt(-c)}v${fmt(-(1 - 2 * c))}z`;
    }
    case "technical":
      return `M${fmt(x + 0.07)} ${fmt(y + 0.07)}h0.86v0.86h-0.86z`;
    case "pixel":
      return `M${fmt(x + 0.11)} ${fmt(y + 0.11)}h0.78v0.78h-0.78z`;
    case "performance":
    case "classic":
    default:
      return `M${fmt(x)} ${fmt(y)}h1v1h-1z`;
  }
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${fmt(x + rr)} ${fmt(y)}h${fmt(w - 2 * rr)}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(rr)} ${fmt(rr)}v${fmt(h - 2 * rr)}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(-rr)} ${fmt(rr)}h${fmt(-(w - 2 * rr))}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(-rr)} ${fmt(-rr)}v${fmt(-(h - 2 * rr))}a${fmt(rr)} ${fmt(rr)} 0 0 1 ${fmt(rr)} ${fmt(-rr)}z`;
}

function hexagonPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${fmt(cx + Math.cos(a) * r)} ${fmt(cy + Math.sin(a) * r)}`);
  }
  return `M${pts.join("L")}z`;
}

/**
 * Finder pattern at module offset (ox, oy). Outer 7x7 ring (1 module wide),
 * inner 3x3 core, with a 1-module light gap between them. Every preset keeps
 * those proportions so the 1:1:3:1:1 scan-line signature survives.
 */
function finderPath(style: QrFinderStyle, ox: number, oy: number): string {
  const cx = ox + 3.5;
  const cy = oy + 3.5;
  switch (style) {
    case "rounded":
      return [roundedRectPath(ox, oy, 7, 7, 2), roundedRectPath(ox + 1, oy + 1, 5, 5, 1.4), roundedRectPath(ox + 2, oy + 2, 3, 3, 0.8)].join("");
    case "double-ring":
      return [
        `M${fmt(cx)} ${fmt(cy - 3.5)}a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0 -7z`,
        `M${fmt(cx)} ${fmt(cy - 2.5)}a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0 -5z`,
        `M${fmt(cx)} ${fmt(cy - 1.5)}a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0 -3z`,
      ].join("");
    case "performance":
      return [roundedRectPath(ox, oy, 7, 7, 1.2), roundedRectPath(ox + 1, oy + 1, 5, 5, 0.7), `M${fmt(ox + 2)} ${fmt(oy + 2)}h3v3h-3z`].join("");
    case "hex":
      return [hexagonPath(cx, cy, 3.9), hexagonPath(cx, cy, 2.75), hexagonPath(cx, cy, 1.65)].join("");
    case "minimal":
      return [roundedRectPath(ox + 0.1, oy + 0.1, 6.8, 6.8, 0.6), roundedRectPath(ox + 1, oy + 1, 5, 5, 0.4), roundedRectPath(ox + 2.1, oy + 2.1, 2.8, 2.8, 0.3)].join("");
    case "classic":
    default:
      return [`M${fmt(ox)} ${fmt(oy)}h7v7h-7z`, `M${fmt(ox + 1)} ${fmt(oy + 1)}h5v5h-5z`, `M${fmt(ox + 2)} ${fmt(oy + 2)}h3v3h-3z`].join("");
  }
}

/** Clamp a requested logo scale to the safe window. */
export function clampLogoScale(scale: number): number {
  return Math.min(LOGO_MAX_SCALE, Math.max(LOGO_MIN_SCALE, Number.isFinite(scale) ? scale : 0.18));
}

export function renderQr(matrix: QrMatrix, o: RenderQrOptions): RenderQrResult {
  const n = matrix.size;
  const total = n + QR_QUIET_ZONE_MODULES * 2;
  const m = o.size / total;
  const q = QR_QUIET_ZONE_MODULES;
  const parts: string[] = [];

  const plateR = (o.plateRadius ?? 0.04) * o.size;
  parts.push(`<rect x="${fmt(o.x)}" y="${fmt(o.y)}" width="${fmt(o.size)}" height="${fmt(o.size)}" rx="${fmt(plateR)}" fill="${o.light}"/>`);

  // Logo cutout, in module coordinates.
  let cut: { r0: number; r1: number; c0: number; c1: number } | null = null;
  let logoBox: RenderQrResult["logoBox"] = null;
  let coverage = 0;
  if (o.logo && o.logo.kind !== "none" && (o.logo.kind === "buildtag" || o.logo.url)) {
    const scale = clampLogoScale(o.logo.scale);
    const logoModules = Math.max(5, Math.round(n * scale));
    const plateModules = logoModules + LOGO_PLATE_MARGIN_MODULES * 2;
    const start = Math.floor((n - plateModules) / 2);
    cut = { r0: start, r1: start + plateModules, c0: start, c1: start + plateModules };
    coverage = (plateModules * plateModules) / (n * n);
    const px = o.x + (q + start) * m;
    const py = o.y + (q + start) * m;
    const ps = plateModules * m;
    logoBox = { x: px + LOGO_PLATE_MARGIN_MODULES * m, y: py + LOGO_PLATE_MARGIN_MODULES * m, w: logoModules * m, h: logoModules * m };
    parts.push(`<rect x="${fmt(px)}" y="${fmt(py)}" width="${fmt(ps)}" height="${fmt(ps)}" rx="${fmt(m * 0.8)}" fill="${o.light}"/>`);
  }

  // Data modules (finder areas and logo cutout excluded).
  const g: string[] = [];
  const styleIsRuns = o.moduleStyle === "performance";
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      const dark = matrix.data[r * n + c] === 1;
      const skip = inFinder(n, r, c) || (cut !== null && r >= cut.r0 && r < cut.r1 && c >= cut.c0 && c < cut.c1);
      if (!dark || skip) {
        c++;
        continue;
      }
      if (styleIsRuns) {
        let run = 1;
        while (
          c + run < n &&
          matrix.data[r * n + c + run] === 1 &&
          !inFinder(n, r, c + run) &&
          !(cut !== null && r >= cut.r0 && r < cut.r1 && c + run >= cut.c0 && c + run < cut.c1)
        ) {
          run++;
        }
        g.push(roundedRectPath(q + c, q + r, run, 1, 0.5));
        c += run;
      } else {
        g.push(modulePath(o.moduleStyle, q + c, q + r));
        c++;
      }
    }
  }
  const finders = [finderPath(o.finderStyle, q, q), finderPath(o.finderStyle, q + n - 7, q), finderPath(o.finderStyle, q, q + n - 7)].join("");

  parts.push(`<g transform="translate(${fmt(o.x)} ${fmt(o.y)}) scale(${fmt(m)})" shape-rendering="${o.moduleStyle === "classic" || o.moduleStyle === "technical" || o.moduleStyle === "pixel" ? "crispEdges" : "geometricPrecision"}">`);
  parts.push(`<path d="${g.join("")}" fill="${o.dark}"/>`);
  parts.push(`<path d="${finders}" fill="${o.dark}" fill-rule="evenodd"/>`);
  parts.push(`</g>`);

  if (logoBox && o.logo) {
    if (o.logo.kind === "buildtag") {
      // Btag mark: fit inside the square logo box, centered on both axes.
      const s = Math.min(logoBox.w / BRAND_VIEWBOX.width, logoBox.h / BRAND_VIEWBOX.height);
      const drawnW = BRAND_VIEWBOX.width * s;
      const drawnH = BRAND_VIEWBOX.height * s;
      parts.push(
        `<g transform="translate(${fmt(logoBox.x + (logoBox.w - drawnW) / 2)} ${fmt(logoBox.y + (logoBox.h - drawnH) / 2)}) scale(${fmt(s)})"><path d="${BRAND_PATH}" fill="${o.dark}" fill-rule="evenodd"/></g>`,
      );
    } else if (o.logo.url) {
      parts.push(`<image href="${escapeAttr(o.logo.url)}" x="${fmt(logoBox.x)}" y="${fmt(logoBox.y)}" width="${fmt(logoBox.w)}" height="${fmt(logoBox.h)}" preserveAspectRatio="xMidYMid meet"/>`);
    }
  }

  return { svg: parts.join(""), logoCoverage: coverage, logoBox };
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export const QR_MODULE_STYLES: { id: QrModuleStyle; name: string; description: string }[] = [
  { id: "classic", name: "Classic Square", description: "The reference look. Most reliable." },
  { id: "soft", name: "Soft Square", description: "Slightly rounded corners." },
  { id: "rounded", name: "Rounded", description: "Rounded modules that still touch." },
  { id: "dots", name: "Dots", description: "Circular modules." },
  { id: "diamond", name: "Diamond-inspired", description: "Chamfered, gem-like modules." },
  { id: "technical", name: "Technical", description: "Thin gaps between modules." },
  { id: "pixel", name: "Pixel", description: "Retro pixel grid." },
  { id: "performance", name: "Performance", description: "Speed-line capsules along each row." },
];

export const QR_FINDER_STYLES: { id: QrFinderStyle; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Square finders." },
  { id: "rounded", name: "Rounded", description: "Soft-cornered finders." },
  { id: "double-ring", name: "Double Ring", description: "Concentric rings with a dot." },
  { id: "performance", name: "Performance", description: "Rounded outer, square core." },
  { id: "hex", name: "Hex-inspired", description: "Hexagonal rings." },
  { id: "minimal", name: "Minimal", description: "Thinner, lighter outer ring." },
];

import { QR_QUIET_ZONE_MODULES, createQrMatrix } from "@/lib/qr/generate";

import { BRAND_VIEWBOX } from "./brand-path";
import { FONTS } from "./fonts";
import { FRAMES } from "./frames";
import { HERO_MULTIPLIER, LAYOUTS, ROLE_SIZE, type Role } from "./layouts";
import { SHAPES } from "./shapes";
import { ctaText } from "./templates";
import { lineInk, printable } from "./measure";
import { toInches } from "./sizes";
import type { TagConfig, TagData, TagLayout, TagSocial, TextLine } from "./types";

/** Logo width for a text size: the height budget stays fs * 7 * 774 / 2400 (the original wordmark's), whatever the mark's proportions. */
function logoWidth(maxW: number, fs: number): number {
  return Math.min(maxW, ((fs * 7 * 774) / 2400) * (BRAND_VIEWBOX.width / BRAND_VIEWBOX.height));
}

export const LAYOUT_WIDTH = 1000;

/** Minimum QR block (incl. quiet zone) as a fraction of the content width before we flag "squeezed". */
export const MIN_QR_FRACTION = 0.4;

interface LineSpec {
  role: Role;
  text: string;
  rel: number;
  color: string;
  icon?: string;
}

export function resolveSocial(config: TagConfig, data: TagData): TagSocial | null {
  if (!data.socials.length) return null;
  if (config.social.source !== "auto") {
    const pick = data.socials.find((s) => s.public_id === config.social.source);
    if (pick) return pick;
  }
  return data.socials.find((s) => s.source === "vehicle") ?? data.socials[0];
}

function collectLines(config: TagConfig, data: TagData): Map<Role, LineSpec> {
  const c = config.text;
  const f = c.fields;
  const out = new Map<Role, LineSpec>();
  const fg = config.colors.foreground;
  const accent = config.colors.accent;

  if (c.logo) out.set("logo", { role: "logo", text: "BUILDTAG", rel: ROLE_SIZE.logo, color: accent });
  if (c.headline !== "none") {
    const text = c.headline === "whats-done" ? "WHAT'S DONE TO IT?" : c.headline === "build-sheet" ? "BUILD SHEET" : c.headlineCustom.trim();
    if (text) out.set("headline", { role: "headline", text, rel: ROLE_SIZE.headline, color: fg });
  }
  const vehicleParts: string[] = [];
  if (f.year && data.year) vehicleParts.push(String(data.year));
  if (f.make && data.make) vehicleParts.push(data.make);
  if (f.model && data.model) vehicleParts.push(data.model);
  if (f.trim && data.trim) vehicleParts.push(data.trim);
  if (vehicleParts.length) out.set("vehicle", { role: "vehicle", text: vehicleParts.join(" "), rel: ROLE_SIZE.vehicle, color: fg });
  if (f.nickname && data.nickname) out.set("nickname", { role: "nickname", text: data.nickname, rel: ROLE_SIZE.nickname, color: accent });
  if (f.power && data.powerLabel) out.set("power", { role: "power", text: data.powerLabel, rel: ROLE_SIZE.power, color: fg });
  if (f.torque && data.torqueLabel) out.set("torque", { role: "torque", text: data.torqueLabel, rel: ROLE_SIZE.torque, color: fg });
  if (f.modCount && data.modCount > 0) out.set("mods", { role: "mods", text: `${data.modCount} MODS`, rel: ROLE_SIZE.mods, color: fg });
  if (f.social) {
    const s = resolveSocial(config, data);
    if (s) out.set("social", { role: "social", text: `@${s.handle.replace(/^@/, "")}`, rel: ROLE_SIZE.social, color: accent, icon: config.social.showIcon ? s.platform : undefined });
  }
  if (f.username && data.username) out.set("username", { role: "username", text: `buildtag/@${data.username}`, rel: ROLE_SIZE.username, color: fg });
  if (c.custom.trim()) out.set("custom", { role: "custom", text: c.custom.trim(), rel: ROLE_SIZE.custom, color: fg });
  const cta = ctaText(c.cta, c.ctaCustom);
  if (cta) out.set("cta", { role: "cta", text: cta, rel: ROLE_SIZE.cta, color: fg });
  return out;
}

export interface LayoutResult extends TagLayout {
  /** True when text forced the QR below its preferred size. */
  qrSqueezed: boolean;
  /** Lines that had to shrink below the printable minimum to fit (see MIN_TEXT_CAP_MM). */
  tinyText: { role: TextLine["role"]; text: string; capMm: number }[];
}

/** Smallest printed cap height that stays readable on vinyl. */
export const MIN_TEXT_CAP_MM = 1.2;
/** Extra clearance inside the print safe margin, in inches. */
const SAFE_CLEARANCE_IN = 0.02;
/** Shapes whose outline curves or angles in, so the plain safe-margin clamp is not enough. */
const CURVED_SHAPES = new Set<string>(["circle", "hex", "gauge", "tire", "wide", "badge", "shield"]);
/** Print safe margin from the cut line, in inches (mirrors DEFAULT_PRINT_GEOMETRY.safeMarginIn). */
export const SAFE_MARGIN_IN = 0.125;

/**
 * Lays the decal out so that everything (text measured from the real font
 * metrics, the QR block with its frame, the logo) sits inside the content
 * rectangle, which itself never comes closer to the cut line than the print
 * safe margin. When the content does not fit, text shrinks before anything
 * leaves the safe area; text that ends up too small to read is reported in
 * tinyText so the Designer can block ordering.
 */
export function layoutTag(config: TagConfig, data: TagData): LayoutResult {
  const shape = SHAPES[config.shape] ?? SHAPES.rounded;
  const layout = LAYOUTS[config.layout] ?? LAYOUTS["text-below"];
  const frame = FRAMES[config.frame] ?? FRAMES.none;
  const font = FONTS[config.font] ?? FONTS.condensed;

  const inches = toInches(config.size);
  const width = LAYOUT_WIDTH;
  const height = Math.round((width * inches.height) / inches.width);
  const unitsPerInch = width / inches.width;
  const m = (SAFE_MARGIN_IN + SAFE_CLEARANCE_IN) * unitsPerInch;
  // Curved and angled outlines: take the content area of the safe-inset outline itself (the green guide in the
  // Designer), so text corners never reach past an arc or chamfer. Straight-edged shapes only need the clamp below.
  const shapeContent = CURVED_SHAPES.has(shape.id)
    ? (() => {
        const r = shape.contentRect(width - m * 2, height - m * 2);
        return { x: r.x + m, y: r.y + m, w: r.w, h: r.h };
      })()
    : shape.contentRect(width, height);
  const cx0 = Math.max(shapeContent.x, m);
  const cy0 = Math.max(shapeContent.y, m);
  const cx1 = Math.min(shapeContent.x + shapeContent.w, width - m);
  const cy1 = Math.min(shapeContent.y + shapeContent.h, height - m);
  const content = { x: cx0, y: cy0, w: Math.max(1, cx1 - cx0), h: Math.max(1, cy1 - cy0) };

  const matrix = createQrMatrix(data.scanUrl);
  const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;

  const specs = collectLines(config, data);
  // Characters the font can't draw (emoji, symbols) would print as empty boxes: drop them.
  const upper = (t: string) => printable(config.font, font.uppercase ? t.toUpperCase() : t);
  const textScale = config.advanced.textScale;

  // Distribute roles into groups per the layout definition.
  const placed = new Set<Role>();
  const pick = (roles: Role[]) => roles.filter((r) => specs.has(r)).map((r) => (placed.add(r), specs.get(r)!));
  const top = pick(layout.top);
  const bottom = pick(layout.bottom);
  const side = pick(layout.side);
  const overflow = [...specs.values()].filter((s) => !placed.has(s.role));
  if (layout.overflow === "top") top.push(...overflow);
  else if (layout.overflow === "side") side.push(...overflow);
  else bottom.push(...overflow);

  const heroRole = layout.hero;
  const relOf = (s: LineSpec) => (heroRole && s.role === heroRole ? s.rel * HERO_MULTIPLIER : s.rel) * textScale;
  const logoRatio = BRAND_VIEWBOX.height / BRAND_VIEWBOX.width;

  /** Geometry of one element at font size 1 (everything scales linearly). */
  const unitInk = (spec: LineSpec, anchor: TextLine["anchor"]) =>
    lineInk({ text: upper(spec.text), font: config.font, fontSize: 1, letterSpacing: font.letterSpacing, anchor, icon: spec.icon });

  interface Item {
    spec: LineSpec;
    fs: number;
    /** Height the element occupies; ascent = distance from its top to the baseline. */
    h: number;
    ascent: number;
    logoW: number;
  }

  /** Font size for a spec in a column of width colW at a given text scale. */
  const sizeItem = (spec: LineSpec, colW: number, scale: number, anchor: TextLine["anchor"], logoMaxW: number): Item => {
    let fs = relOf(spec) * colW * scale;
    if (spec.role === "logo") {
      const logoW = logoWidth(logoMaxW, fs);
      return { spec, fs, h: logoW * logoRatio, ascent: 0, logoW };
    }
    const u = unitInk(spec, anchor);
    const need = anchor === "middle" ? 2 * Math.max(-u.x0, u.x1) : u.x1 - Math.min(0, u.x0);
    if (need > 0) fs = Math.min(fs, colW / need);
    return { spec, fs, h: fs * (u.top + u.bottom), ascent: fs * u.top, logoW: 0 };
  };

  const makeLine = (item: Item, x: number, baseline: number, anchor: TextLine["anchor"]): TextLine => ({
    role: item.spec.role,
    text: upper(item.spec.text),
    x,
    y: baseline,
    fontSize: item.fs,
    anchor,
    letterSpacing: item.fs * font.letterSpacing,
    font: config.font,
    color: item.spec.color,
    icon: item.spec.icon,
  });

  const lines: TextLine[] = [];
  let qr: TagLayout["qr"] = null;
  let logoBox: TagLayout["logoBox"] = null;
  let qrSqueezed = false;
  let used: Item[] = [];

  const minFrameFor = (w: number) => (MIN_QR_FRACTION * w) / frame.inner;

  if (layout.mode === "stack") {
    // Spacing follows the text: never more than 45% of the average element height, so many small lines still fit.
    let gap = content.w * 0.03;
    const all = [...top, ...bottom];
    const preferred = Math.min(content.w, content.h) * layout.qrFraction * config.qr.scale;
    const absoluteMinFrame = Math.min(content.w, content.h) * 0.25;
    let scale = 1;
    let items: Item[] = [];
    let textH = 0;
    let frameSize = 0;
    for (let i = 0; i < 60; i++) {
      items = all.map((s) => sizeItem(s, content.w, scale, "middle", content.w * 0.55));
      const itemsH = items.reduce((sum, it) => sum + it.h, 0);
      gap = Math.min(content.w * 0.03, all.length ? (itemsH / all.length) * 0.45 : 0);
      textH = itemsH + gap * all.length;
      frameSize = Math.min(content.w, preferred, content.h - textH);
      if (all.length === 0) break;
      // Stop once the QR has its comfortable minimum, or at least the absolute minimum after text has shrunk a lot.
      if (frameSize >= minFrameFor(content.w) || (frameSize >= absoluteMinFrame && scale < 0.5)) break;
      scale *= 0.92;
    }
    frameSize = Math.max(0, Math.min(frameSize, content.w, content.h - textH));
    if (frameSize < minFrameFor(content.w)) qrSqueezed = true;
    used = items;

    const total = textH + frameSize;
    let cursor = content.y + Math.max(0, (content.h - total) / 2);
    const cx = content.x + content.w / 2;
    const place = (it: Item) => {
      if (it.spec.role === "logo") {
        logoBox = { x: cx - it.logoW / 2, y: cursor, w: it.logoW, h: it.h };
      } else {
        lines.push(makeLine(it, cx, cursor + it.ascent, "middle"));
      }
      cursor += it.h + gap;
    };
    items.slice(0, top.length).forEach(place);
    {
      const size = frameSize * frame.inner;
      const fx = cx - frameSize / 2;
      qr = { frameX: fx, frameY: cursor, frameSize, x: cx - size / 2, y: cursor + (frameSize - size) / 2, size, totalModules, moduleSize: size / totalModules, matrixSize: matrix.size };
      cursor += frameSize + (bottom.length ? gap : 0);
    }
    items.slice(top.length).forEach(place);
  } else {
    // Row: QR on one side, a text column on the other.
    const gap = content.w * 0.04;
    const preferred = Math.min(content.h, content.w * 0.48) * layout.qrFraction * config.qr.scale;
    const frameSize = Math.min(content.h, content.w * 0.6, Math.max(content.w * 0.25, preferred));
    const colW = Math.max(1, content.w - frameSize - gap);
    const colX = layout.qrSide === "left" ? content.x + frameSize + gap : content.x;
    const qrX = layout.qrSide === "left" ? content.x : content.x + content.w - frameSize;
    const anchor: TextLine["anchor"] = layout.textAlign === "start" ? "start" : "middle";

    let scale = 1;
    let items: Item[] = [];
    let textH = 0;
    for (let i = 0; i < 60; i++) {
      items = side.map((s) => sizeItem(s, colW, scale * 1.15, anchor, colW * 0.9));
      const lineGap = items.length ? (items.reduce((s2, it) => s2 + it.h, 0) / items.length) * 0.28 : 0;
      textH = items.reduce((sum, it) => sum + it.h, 0) + lineGap * Math.max(0, items.length - 1);
      if (textH <= content.h) break;
      scale *= 0.92;
    }
    // The QR column is sized independently of the text here; text that can't fit shrinks (and shows up in tinyText).
    used = items;

    const size = frameSize * frame.inner;
    const fy = content.y + (content.h - frameSize) / 2;
    qr = { frameX: qrX, frameY: fy, frameSize, x: qrX + (frameSize - size) / 2, y: fy + (frameSize - size) / 2, size, totalModules, moduleSize: size / totalModules, matrixSize: matrix.size };

    const lineGap = items.length ? (items.reduce((s2, it) => s2 + it.h, 0) / items.length) * 0.28 : 0;
    let cursor = content.y + Math.max(0, (content.h - textH) / 2);
    const ax = anchor === "start" ? colX : colX + colW / 2;
    for (const it of items) {
      if (it.spec.role === "logo") {
        logoBox = { x: anchor === "start" ? colX : ax - it.logoW / 2, y: cursor, w: it.logoW, h: it.h };
      } else {
        // A left overhang (italic fonts) must not cross the column edge.
        const shift = anchor === "start" ? Math.max(0, -unitInk(it.spec, anchor).x0 * it.fs) : 0;
        lines.push(makeLine(it, ax + shift, cursor + it.ascent, anchor));
      }
      cursor += it.h + lineGap;
    }
  }

  const mmPerUnit = (inches.width * 25.4) / width;
  const tinyText = used
    .filter((it) => it.spec.role !== "logo")
    .map((it) => ({ role: it.spec.role, text: upper(it.spec.text), capMm: it.fs * font.capHeight * mmPerUnit }))
    .filter((t) => t.capMm < MIN_TEXT_CAP_MM);

  return { width, height, contentRect: content, qr, lines, logoBox, qrSqueezed, tinyText };
}

/** QR module size in millimetres for the current config (null without QR). */
export function moduleSizeMm(config: TagConfig, layout: TagLayout): number | null {
  if (!layout.qr) return null;
  const inches = toInches(config.size);
  const mmPerUnit = (inches.width * 25.4) / layout.width;
  return layout.qr.moduleSize * mmPerUnit;
}

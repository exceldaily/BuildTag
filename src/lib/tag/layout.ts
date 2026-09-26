import { QR_QUIET_ZONE_MODULES, createQrMatrix } from "@/lib/qr/generate";

import { BRAND_VIEWBOX } from "./brand-path";
import { FONTS } from "./fonts";
import { FRAMES } from "./frames";
import { HERO_MULTIPLIER, LAYOUTS, ROLE_SIZE, type Role } from "./layouts";
import { SHAPES } from "./shapes";
import { ctaText } from "./templates";
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
}

export function layoutTag(config: TagConfig, data: TagData): LayoutResult {
  const shape = SHAPES[config.shape] ?? SHAPES.rounded;
  const layout = LAYOUTS[config.layout] ?? LAYOUTS["text-below"];
  const frame = FRAMES[config.frame] ?? FRAMES.none;
  const font = FONTS[config.font] ?? FONTS.condensed;

  const inches = toInches(config.size);
  const width = LAYOUT_WIDTH;
  const height = Math.round((width * inches.height) / inches.width);
  const content = shape.contentRect(width, height);

  const matrix = createQrMatrix(data.scanUrl);
  const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;

  const specs = collectLines(config, data);
  const upper = (t: string) => (font.uppercase ? t.toUpperCase() : t);
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

  const fitFont = (spec: LineSpec, maxWidth: number, columnWidth: number, scale: number): number => {
    const text = upper(spec.text);
    const iconPad = spec.icon ? 1.3 : 0;
    const base = relOf(spec) * columnWidth * scale;
    const perChar = font.factor + font.letterSpacing;
    const fitted = maxWidth / Math.max(1, text.length * perChar + iconPad);
    return Math.max(6, Math.min(base, fitted));
  };

  const makeLine = (spec: LineSpec, x: number, y: number, fontSize: number, anchor: TextLine["anchor"]): TextLine => ({
    role: spec.role,
    text: upper(spec.text),
    x,
    y,
    fontSize,
    anchor,
    letterSpacing: fontSize * font.letterSpacing,
    font: config.font,
    color: spec.color,
    icon: spec.icon,
  });

  const lines: TextLine[] = [];
  let qr: TagLayout["qr"] = null;
  let logoBox: TagLayout["logoBox"] = null;
  let qrSqueezed = false;

  if (layout.mode === "stack") {
    const gap = content.w * 0.03;
    const all = [...top, ...bottom];
    let scale = 1;
    let sizes: number[] = [];
    let textHeight = 0;
    let frameSize = 0;
    const preferred = Math.min(content.w, content.h) * layout.qrFraction * config.qr.scale;
    for (let i = 0; i < 7; i++) {
      sizes = all.map((s) => fitFont(s, content.w, content.w, scale));
      textHeight = sizes.reduce((sum, fs) => sum + fs * 1.22, 0) + (all.length ? gap * (all.length + 1) : 0);
      const avail = content.h - textHeight;
      frameSize = Math.min(content.w, avail, preferred);
      const minFrame = (MIN_QR_FRACTION * content.w) / frame.inner;
      if (frameSize >= minFrame || all.length === 0) break;
      scale *= 0.84;
    }
    if (frameSize < (MIN_QR_FRACTION * content.w) / frame.inner) qrSqueezed = true;
    frameSize = Math.max(frameSize, content.w * 0.25);

    const used = textHeight + frameSize;
    let cursor = content.y + Math.max(0, (content.h - used) / 2);
    const cx = content.x + content.w / 2;
    let i = 0;
    for (const spec of top) {
      const fs = sizes[i++];
      cursor += gap + fs * 0.95;
      if (spec.role === "logo") {
        const w = logoWidth(content.w * 0.55, fs);
        logoBox = { x: cx - w / 2, y: cursor - fs * 0.95, w, h: (w * BRAND_VIEWBOX.height) / BRAND_VIEWBOX.width };
        cursor = logoBox.y + logoBox.h;
      } else {
        lines.push(makeLine(spec, cx, cursor, fs, "middle"));
      }
      cursor += fs * 0.27;
    }

    {
      const size = frameSize * frame.inner;
      const fx = cx - frameSize / 2;
      cursor += all.length ? gap : 0;
      qr = { frameX: fx, frameY: cursor, frameSize, x: cx - size / 2, y: cursor + (frameSize - size) / 2, size, totalModules, moduleSize: size / totalModules, matrixSize: matrix.size };
      cursor += frameSize;
    }

    for (const spec of bottom) {
      const fs = sizes[i++];
      cursor += gap + fs * 0.95;
      if (spec.role === "logo") {
        const w = logoWidth(content.w * 0.55, fs);
        logoBox = { x: cx - w / 2, y: cursor - fs * 0.95, w, h: (w * BRAND_VIEWBOX.height) / BRAND_VIEWBOX.width };
        cursor = logoBox.y + logoBox.h;
      } else {
        lines.push(makeLine(spec, cx, cursor, fs, "middle"));
      }
      cursor += fs * 0.27;
    }
  } else {
    // Row: QR on one side, a text column on the other.
    const gap = content.w * 0.04;
    const preferred = Math.min(content.h, content.w * 0.48) * layout.qrFraction * config.qr.scale;
    const frameSize = Math.max(content.w * 0.25, preferred);
    const colW = content.w - frameSize - gap;
    const colX = layout.qrSide === "left" ? content.x + frameSize + gap : content.x;
    const qrX = layout.qrSide === "left" ? content.x : content.x + content.w - frameSize;

    let scale = 1;
    let sizes: number[] = [];
    let textHeight = 0;
    for (let i = 0; i < 7; i++) {
      sizes = side.map((s) => fitFont(s, colW, colW, scale * 1.15));
      textHeight = sizes.reduce((sum, fs) => sum + fs * 1.28, 0);
      if (textHeight <= content.h) break;
      scale *= 0.86;
    }
    if (textHeight > content.h) qrSqueezed = true;

    const size = frameSize * frame.inner;
    const fy = content.y + (content.h - frameSize) / 2;
    qr = { frameX: qrX, frameY: fy, frameSize, x: qrX + (frameSize - size) / 2, y: fy + (frameSize - size) / 2, size, totalModules, moduleSize: size / totalModules, matrixSize: matrix.size };

    let cursor = content.y + Math.max(0, (content.h - textHeight) / 2);
    const anchor = layout.textAlign === "start" ? "start" : "middle";
    const ax = anchor === "start" ? colX : colX + colW / 2;
    side.forEach((spec, idx) => {
      const fs = sizes[idx];
      cursor += fs;
      if (spec.role === "logo") {
        const w = logoWidth(colW * 0.9, fs);
        logoBox = { x: anchor === "start" ? colX : ax - w / 2, y: cursor - fs, w, h: (w * BRAND_VIEWBOX.height) / BRAND_VIEWBOX.width };
        cursor = logoBox.y + logoBox.h;
      } else {
        lines.push(makeLine(spec, ax, cursor, fs, anchor));
      }
      cursor += fs * 0.28;
    });
  }

  return { width, height, contentRect: content, qr, lines, logoBox, qrSqueezed };
}

/** QR module size in millimetres for the current config (null without QR). */
export function moduleSizeMm(config: TagConfig, layout: TagLayout): number | null {
  if (!layout.qr) return null;
  const inches = toInches(config.size);
  const mmPerUnit = (inches.width * 25.4) / layout.width;
  return layout.qr.moduleSize * mmPerUnit;
}

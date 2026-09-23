import { QR_QUIET_ZONE_MODULES, createQrMatrix } from "@/lib/qr/generate";

import { FRAMES } from "./frames";
import { SHAPES } from "./shapes";
import { STYLES } from "./styles";
import { DEFAULT_CTA } from "./templates";
import type { TagConfig, TagData, TagLayout, TextLine } from "./types";

export const LAYOUT_WIDTH = 1000;

/** Minimum QR block (incl. quiet zone) as a fraction of the content width. */
const MIN_QR_FRACTION = 0.42;

interface LineSpec {
  role: TextLine["role"];
  text: string;
  /** Font size relative to content width. */
  rel: number;
  display: boolean;
  color?: "fg" | "accent";
}

function collectLines(config: TagConfig, data: TagData): { top: LineSpec[]; bottom: LineSpec[] } {
  const c = config.content;
  const top: LineSpec[] = [];
  const bottom: LineSpec[] = [];

  if (c.logo) top.push({ role: "logo", text: "BUILDTAG", rel: 0.075, display: true, color: "accent" });
  if (c.whatsDoneText) top.push({ role: "headline", text: "WHAT'S DONE TO IT?", rel: 0.082, display: true });
  if (c.buildSheetText) top.push({ role: "headline", text: "BUILD SHEET", rel: 0.082, display: true });

  const vehicleParts: string[] = [];
  if (c.year && data.year) vehicleParts.push(String(data.year));
  if (c.make && data.make) vehicleParts.push(data.make);
  if (c.model && data.model) vehicleParts.push(data.model);
  if (vehicleParts.length) top.push({ role: "vehicle", text: vehicleParts.join(" "), rel: 0.078, display: true });
  if (c.nickname && data.nickname) top.push({ role: "nickname", text: data.nickname, rel: 0.07, display: true, color: "accent" });

  if (c.horsepower && data.powerLabel) bottom.push({ role: "power", text: data.powerLabel, rel: 0.13, display: true });
  if (c.social && data.socialHandle) bottom.push({ role: "social", text: data.socialHandle, rel: 0.072, display: false, color: "accent" });
  if (c.customText.trim()) bottom.push({ role: "custom", text: c.customText.trim(), rel: 0.06, display: false });
  if (c.scanText || config.ctaText.trim()) {
    bottom.push({ role: "cta", text: config.ctaText.trim() || DEFAULT_CTA, rel: 0.062, display: true });
  }

  return { top, bottom };
}

export function layoutTag(config: TagConfig, data: TagData): TagLayout {
  const shape = SHAPES[config.shape] ?? SHAPES.rounded;
  const style = STYLES[config.style] ?? STYLES.minimal;
  const frame = FRAMES[config.frame] ?? FRAMES.none;

  const width = LAYOUT_WIDTH;
  const height = Math.round(width * shape.aspect);
  const content = shape.contentRect(width, height);
  const { top, bottom } = collectLines(config, data);
  const allSpecs = [...top, ...bottom];

  const matrix = createQrMatrix(data.scanUrl);
  const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;

  const lines: TextLine[] = [];
  let qr: TagLayout["qr"] = null;

  const upper = (t: string) => (style.uppercase ? t.toUpperCase() : t);

  const fitFont = (spec: LineSpec, maxWidth: number, scale: number): number => {
    const factor = spec.display ? style.displayFactor : style.bodyFactor;
    const tracking = style.letterSpacing;
    const text = upper(spec.text);
    const base = spec.rel * content.w * scale;
    const perChar = factor + tracking;
    const fitted = maxWidth / Math.max(1, text.length * perChar);
    return Math.max(8, Math.min(base, fitted));
  };

  const makeLine = (spec: LineSpec, x: number, y: number, fontSize: number, anchor: TextLine["anchor"]): TextLine => ({
    role: spec.role,
    text: upper(spec.text),
    x,
    y,
    fontSize,
    anchor,
    letterSpacing: fontSize * style.letterSpacing,
    fontFamily: spec.display ? style.displayFont : style.bodyFont,
    weight: spec.display ? 900 : 700,
    color: spec.color === "accent" ? config.colors.accent : config.colors.foreground,
  });

  if (!shape.landscape) {
    // Vertical stack: top lines, QR (+frame), bottom lines.
    const gap = content.w * 0.035;
    let scale = 1;
    let sizes: number[] = [];
    let textHeight = 0;
    let frameSize = 0;

    for (let i = 0; i < 6; i++) {
      sizes = allSpecs.map((s) => fitFont(s, content.w, scale));
      textHeight = sizes.reduce((sum, fs) => sum + fs * 1.25, 0) + (allSpecs.length ? gap * allSpecs.length : 0);
      const avail = content.h - textHeight;
      frameSize = config.content.qr ? Math.min(content.w, avail) : 0;
      const minFrame = (MIN_QR_FRACTION * content.w) / frame.inner;
      if (!config.content.qr || frameSize >= minFrame || allSpecs.length === 0) break;
      scale *= 0.82;
    }
    if (config.content.qr) frameSize = Math.max(frameSize, 0);

    const usedHeight = textHeight + frameSize;
    let cursor = content.y + Math.max(0, (content.h - usedHeight) / 2);
    const cx = content.x + content.w / 2;

    let i = 0;
    for (const spec of top) {
      const fs = sizes[i++];
      cursor += fs * 1.0;
      lines.push(makeLine(spec, cx, cursor, fs, "middle"));
      cursor += fs * 0.25 + gap;
    }

    if (config.content.qr && frameSize > 0) {
      const size = frameSize * frame.inner;
      const fx = cx - frameSize / 2;
      qr = {
        frameX: fx,
        frameY: cursor,
        frameSize,
        x: cx - size / 2,
        y: cursor + (frameSize - size) / 2,
        size,
        totalModules,
        moduleSize: size / totalModules,
      };
      cursor += frameSize + (bottom.length ? gap : 0);
    }

    for (const spec of bottom) {
      const fs = sizes[i++];
      cursor += fs * 1.0;
      lines.push(makeLine(spec, cx, cursor, fs, "middle"));
      cursor += fs * 0.25 + gap;
    }
  } else {
    // Landscape: QR left, text column right (or centered QR when no text).
    const frameSize = config.content.qr ? Math.min(content.h, content.w * 0.45) : 0;
    const gap = content.w * 0.04;
    const textX = content.x + frameSize + (frameSize ? gap : 0);
    const textW = content.x + content.w - textX;

    const specs = allSpecs;
    let scale = 1;
    let sizes: number[] = [];
    let textHeight = 0;
    for (let i = 0; i < 6; i++) {
      sizes = specs.map((s) => fitFont(s, textW, scale * 1.35));
      textHeight = sizes.reduce((sum, fs) => sum + fs * 1.3, 0);
      if (textHeight <= content.h) break;
      scale *= 0.85;
    }

    if (config.content.qr && frameSize > 0) {
      const size = frameSize * frame.inner;
      const fx = specs.length ? content.x : content.x + (content.w - frameSize) / 2;
      const fy = content.y + (content.h - frameSize) / 2;
      qr = {
        frameX: fx,
        frameY: fy,
        frameSize,
        x: fx + (frameSize - size) / 2,
        y: fy + (frameSize - size) / 2,
        size,
        totalModules,
        moduleSize: size / totalModules,
      };
    }

    let cursor = content.y + (content.h - textHeight) / 2;
    const cx = frameSize ? textX + textW / 2 : content.x + content.w / 2;
    specs.forEach((spec, idx) => {
      const fs = sizes[idx];
      cursor += fs;
      lines.push(makeLine(spec, cx, cursor, fs, "middle"));
      cursor += fs * 0.3;
    });
  }

  return { width, height, contentRect: content, qr, lines, landscape: shape.landscape };
}

/** Physical dimensions of a config. */
export function physicalSize(config: TagConfig): { width: number; height: number; unit: "in" | "mm"; widthIn: number; heightIn: number } {
  const shape = SHAPES[config.shape] ?? SHAPES.rounded;
  const w = config.size.width;
  const h = w * shape.aspect;
  const widthIn = config.size.unit === "mm" ? w / 25.4 : w;
  return { width: w, height: h, unit: config.size.unit, widthIn, heightIn: widthIn * shape.aspect };
}

/** QR module size in millimetres for the current config (null without QR). */
export function moduleSizeMm(config: TagConfig, layout: TagLayout): number | null {
  if (!layout.qr) return null;
  const { widthIn } = physicalSize(config);
  const mmPerUnit = (widthIn * 25.4) / layout.width;
  return layout.qr.moduleSize * mmPerUnit;
}

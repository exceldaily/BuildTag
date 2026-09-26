/**
 * Print-fit check for the BuildTag Designer. For every combination a customer
 * can pick (template, layout, shape, size, font, text scale, QR scale, frame,
 * short and maximum-length text), lays the decal out through the real layout
 * engine and verifies, in print geometry:
 *
 *   1. every text line (measured from the real font outlines, the same ones
 *      the production export converts to paths), the QR block, its frame and
 *      the logo sit inside the SAFE AREA: the cut shape inset by the 1/8 in
 *      safe margin, the same green guide the Designer shows;
 *   2. no text overlaps the QR block, the logo or another line;
 *   3. text is large enough to read once printed (cap height >= 1.2 mm).
 *      Designs that fail only this are BLOCKED from ordering by the Designer
 *      (layout.tinyText -> "Text too small to print"), so they are reported,
 *      not counted as print failures.
 *
 *   pnpm tag:fit            # summary; exits 1 when anything could print outside the safe area or overlap
 *   pnpm tag:fit --verbose  # every failing design
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import * as opentype from "opentype.js";
import sharp from "sharp";

import { DEFAULT_PRINT_GEOMETRY, FONTS, FONT_LIST, FRAME_LIST, LAYOUT_LIST, SHAPES, SHAPE_LIST, TEMPLATE_LIST, layoutTag, toInches } from "../src/lib/tag";
import { FRAMES } from "../src/lib/tag/frames";
import { iconSizeFor, lineInk } from "../src/lib/tag/measure";
import type { FontId, FrameId, ShapeId, TagConfig, TagData, TagSize, TextLine } from "../src/lib/tag/types";

const VERBOSE = process.argv.includes("--verbose");
const MIN_CAP_MM = 1.2;
const TOLERANCE = 0.5; // layout units (~0.05 mm on a 4 in decal): antialiasing, not a real overflow

const TYPICAL: TagData = {
  scanUrl: "https://buildtags.app/s/GHS7K2P9",
  year: 2022,
  make: "Toyota",
  model: "GR Supra",
  trim: "3.0 Premium",
  nickname: "GHOST",
  powerLabel: "612 WHP",
  torqueLabel: "574 WTQ",
  modCount: 24,
  username: "ghost_supra",
  socials: [{ public_id: "x", platform: "instagram", handle: "ghost_supra", source: "vehicle" }],
};

// Every field at the longest value the forms accept (make/model/trim 60, nickname 40, handle 30 typical max).
const LONGEST: TagData = {
  scanUrl: "https://buildtags.app/s/GHS7K2P9",
  year: 2024,
  make: "Mercedes-Benz AMG Performance Division Special Vehicle Ops",
  model: "GT Black Series Track Package Carbon Aero Edition Limited 1of1",
  trim: "Performance Edition with Extended Warranty and Track Pack",
  nickname: "MIDNIGHT EXPRESS STREET MACHINE PROJECT",
  powerLabel: "1,250 WHP",
  torqueLabel: "1,100 WTQ",
  modCount: 148,
  username: "midnight_express_builds_2024",
  socials: [{ public_id: "x", platform: "instagram", handle: "midnight.express.street.machine", source: "vehicle" }],
};

const SIZES: TagSize[] = [
  { id: "small", width: 3, height: 3, unit: "in" },
  { id: "standard", width: 4, height: 4, unit: "in" },
  { id: "wide", width: 5, height: 3, unit: "in" },
  { id: "large", width: 5, height: 5, unit: "in" },
  { id: "custom", width: 2, height: 2, unit: "in" },
  { id: "custom", width: 6, height: 2, unit: "in" },
  { id: "custom", width: 2.5, height: 4, unit: "in" },
];

/* ---------------------------------------------------------------- fonts */

const fonts = new Map<FontId, opentype.Font>();
for (const f of FONT_LIST) {
  const buf = readFileSync(path.join(process.cwd(), "public", FONTS[f.id].file));
  fonts.set(f.id, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Same geometry as render.ts textElement() + export.ts makeTextToPath(): icon placed as render.ts does, text ink from the real outlines. */
function textBoxes(line: TextLine): Box[] {
  const font = fonts.get(line.font)!;
  const boxes: Box[] = [];
  let x = line.x;
  let anchor = line.anchor;
  if (line.icon) {
    const ink = lineInk(line);
    const iconSize = iconSizeFor(line.font, line.fontSize);
    const startX = line.x + (ink.iconX ?? 0);
    const iy = line.y - iconSize * 0.95;
    boxes.push({ x0: startX, y0: iy, x1: startX + iconSize, y1: iy + iconSize });
    x = line.x + ink.textX;
    anchor = "start";
  }
  const opts = { letterSpacing: line.letterSpacing / line.fontSize, kerning: true };
  const width = font.getAdvanceWidth(line.text, line.fontSize, opts);
  const sx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const bb = font.getPath(line.text, sx, line.y, line.fontSize, opts).getBoundingBox();
  if (Number.isFinite(bb.x1)) boxes.push({ x0: bb.x1, y0: bb.y1, x1: bb.x2, y1: bb.y2 });
  return boxes;
}

/* ---------------------------------------------------------------- safe-area masks */

const maskCache = new Map<string, Promise<{ w: number; h: number; data: Buffer }>>();

function safeMask(shape: ShapeId, size: TagSize) {
  const inches = toInches(size);
  const w = 1000;
  const h = Math.round((w * inches.height) / inches.width);
  const key = `${shape}:${w}x${h}`;
  let p = maskCache.get(key);
  if (!p) {
    const s = DEFAULT_PRINT_GEOMETRY.safeMarginIn * (w / inches.width);
    const d = SHAPES[shape].path(w - s * 2, h - s * 2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#000"/><path d="${d}" transform="translate(${s} ${s})" fill="#fff"/></svg>`;
    p = sharp(Buffer.from(svg)).greyscale().raw().toBuffer().then((data) => ({ w, h, data }));
    maskCache.set(key, p);
  }
  return p;
}

/** Ink outline of each frame as points in a unit square (frames are drawn into a square). */
const frameInk = new Map<FrameId, Promise<[number, number][]>>();
function frameOutline(id: FrameId) {
  let p = frameInk.get(id);
  if (!p) {
    const S = 400;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#000"/>${FRAMES[id].render(0, 0, S, { fg: "#fff", accent: "#fff", bg: "#fff" })}<rect x="${(S * (1 - FRAMES[id].inner)) / 2}" y="${(S * (1 - FRAMES[id].inner)) / 2}" width="${S * FRAMES[id].inner}" height="${S * FRAMES[id].inner}" fill="#fff"/></svg>`;
    p = sharp(Buffer.from(svg)).greyscale().raw().toBuffer().then((d) => {
      const pts: [number, number][] = [];
      const ink = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < S && d[y * S + x] > 60;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++)
          if (ink(x, y) && (!ink(x - 1, y) || !ink(x + 1, y) || !ink(x, y - 1) || !ink(x, y + 1))) pts.push([(x + 0.5) / S, (y + 0.5) / S]);
      return pts;
    });
    frameInk.set(id, p);
  }
  return p;
}

function boxPoints(b: Box, step = 2): [number, number][] {
  const pts: [number, number][] = [];
  for (let x = b.x0; x <= b.x1; x += step) pts.push([x, b.y0], [x, b.y1]);
  for (let y = b.y0; y <= b.y1; y += step) pts.push([b.x0, y], [b.x1, y]);
  pts.push([b.x1, b.y1]);
  return pts;
}

const shrink = (b: Box, t: number): Box => ({ x0: b.x0 + t, y0: b.y0 + t, x1: b.x1 - t, y1: b.y1 - t });
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 - TOLERANCE && b.x0 < a.x1 - TOLERANCE && a.y0 < b.y1 - TOLERANCE && b.y0 < a.y1 - TOLERANCE;

/* ---------------------------------------------------------------- check */

interface Failure {
  kind: "outside-safe-area" | "overlap" | "tiny-text";
  what: string;
}

async function check(config: TagConfig, data: TagData): Promise<Failure[]> {
  const layout = layoutTag(config, data);
  const mask = await safeMask(config.shape, config.size);
  const inside = (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < mask.w && yi < mask.h && mask.data[yi * mask.w + xi] > 127;
  };
  const failures: Failure[] = [];
  const outside = (what: string, pts: [number, number][]) => {
    if (pts.some(([x, y]) => !inside(x, y))) failures.push({ kind: "outside-safe-area", what });
  };

  const mmPerUnit = (toInches(config.size).width * 25.4) / layout.width;
  const textRegions: { what: string; box: Box }[] = [];
  for (const line of layout.lines) {
    const boxes = textBoxes(line);
    for (const b of boxes) {
      outside(`text "${line.text}"`, boxPoints(shrink(b, TOLERANCE)));
      textRegions.push({ what: `"${line.text}"`, box: b });
    }
    const capMm = line.fontSize * FONTS[line.font].capHeight * mmPerUnit;
    if (capMm < MIN_CAP_MM) failures.push({ kind: "tiny-text", what: `"${line.text}" ${capMm.toFixed(2)} mm tall` });
  }

  const blocks: { what: string; box: Box }[] = [];
  if (layout.qr) {
    const q = layout.qr;
    const qrBox = { x0: q.x, y0: q.y, x1: q.x + q.size, y1: q.y + q.size };
    outside("QR code", boxPoints(shrink(qrBox, TOLERANCE)));
    blocks.push({ what: "QR code", box: qrBox });
    if (config.frame !== "none") {
      const pts = (await frameOutline(config.frame)).map(([u, v]) => [q.frameX + u * q.frameSize, q.frameY + v * q.frameSize] as [number, number]);
      outside(`${config.frame} frame`, pts);
    }
  }
  if (layout.logoBox) {
    const l = layout.logoBox;
    const logoBox = { x0: l.x, y0: l.y, x1: l.x + l.w, y1: l.y + l.h };
    outside("logo", boxPoints(shrink(logoBox, TOLERANCE)));
    blocks.push({ what: "logo", box: logoBox });
  }

  for (let i = 0; i < textRegions.length; i++) {
    for (const b of blocks) if (overlaps(textRegions[i].box, b.box)) failures.push({ kind: "overlap", what: `${textRegions[i].what} over ${b.what}` });
    for (let j = i + 1; j < textRegions.length; j++)
      if (overlaps(textRegions[i].box, textRegions[j].box)) failures.push({ kind: "overlap", what: `${textRegions[i].what} over ${textRegions[j].what}` });
  }
  return failures;
}

/* ---------------------------------------------------------------- matrix */

function allFields(c: TagConfig): TagConfig {
  return {
    ...c,
    text: {
      ...c.text,
      logo: true,
      headline: "custom",
      headlineCustom: "WHAT'S DONE TO THIS BUILD? SCAN AND SEE",
      cta: "custom",
      ctaCustom: "SCAN THE BUILD FOR THE FULL MOD LIST",
      custom: "STAGE 3 · E85 · BUILT NOT BOUGHT · 2024",
      fields: { year: true, make: true, model: true, trim: true, nickname: true, power: true, torque: true, modCount: true, social: true, username: true },
    },
  };
}

async function main() {
  const counts = { designs: 0, failed: 0, blocked: 0 };
  const byKind = new Map<string, number>();
  const byAxis = new Map<string, number>();
  const examples: string[] = [];

  const run = async (label: string, axes: string[], config: TagConfig, data: TagData) => {
    counts.designs++;
    const f = await check(config, data);
    if (!f.length) return;
    if (f.every((x) => x.kind === "tiny-text")) {
      counts.blocked++;
      if (VERBOSE) examples.push(`BLOCKED ${label}: ${f.map((x) => x.what).join("; ")}`);
      return;
    }
    counts.failed++;
    for (const k of new Set(f.map((x) => x.kind))) byKind.set(k, (byKind.get(k) ?? 0) + 1);
    for (const a of axes) byAxis.set(a, (byAxis.get(a) ?? 0) + 1);
    if (VERBOSE || examples.length < 25) examples.push(`${label}: ${f.map((x) => `${x.kind} ${x.what}`).join("; ")}`);
  };

  // 1. Each template as shipped, re-shaped/re-sized/re-fonted by the customer, short and long text.
  for (const t of TEMPLATE_LIST) {
    for (const shape of SHAPE_LIST) {
      for (const size of SIZES) {
        for (const font of FONT_LIST) {
          for (const textScale of [1, 1.3]) {
            for (const [dn, data] of [["typical", TYPICAL], ["longest", LONGEST]] as const) {
              const base = t.build();
              const cfg: TagConfig = { ...base, shape: shape.id, size, font: font.id, advanced: { ...base.advanced, textScale } };
              const sz = `${size.width}x${size.height}`;
              await run(`template=${t.id} layout=${cfg.layout} shape=${shape.id} size=${sz} font=${font.id} text=${textScale} data=${dn}`, [`layout:${cfg.layout}`, `shape:${shape.id}`, `size:${sz}`, `font:${font.id}`, `scale:${textScale}`, `data:${dn}`], cfg, data);
            }
          }
        }
      }
    }
  }

  // 2. Worst case: every field on at maximum length, every layout, every frame.
  const base = TEMPLATE_LIST[0].build();
  for (const layout of LAYOUT_LIST) {
    for (const shape of SHAPE_LIST) {
      for (const size of SIZES) {
        for (const frame of FRAME_LIST) {
          for (const textScale of [0.7, 1, 1.3]) {
            for (const qrScale of [0.6, 1]) {
              const cfg: TagConfig = { ...allFields(base), layout: layout.id, shape: shape.id, size, frame: frame.id, font: "condensed", qr: { ...base.qr, scale: qrScale }, advanced: { ...base.advanced, textScale } };
              const sz = `${size.width}x${size.height}`;
              await run(`ALL-FIELDS layout=${layout.id} shape=${shape.id} size=${sz} frame=${frame.id} text=${textScale} qr=${qrScale}`, [`layout:${layout.id}`, `shape:${shape.id}`, `size:${sz}`, `frame:${frame.id}`, `scale:${textScale}`, "data:all-fields"], cfg, LONGEST);
            }
          }
        }
      }
    }
  }

  console.log(`checked ${counts.designs} designs`);
  console.log(`  ${counts.failed} would print outside the safe area or overlap (must be 0)`);
  console.log(`  ${counts.blocked} have text too small to read at that size: the Designer blocks ordering and says why`);
  for (const [k, n] of byKind) console.log(`    ${k}: ${n}`);
  if (counts.failed) {
    console.log("\nfailures by option (a design counts once per option it uses):");
    for (const [a, n] of [...byAxis].sort((x, y) => y[1] - x[1]).slice(0, 40)) console.log(`  ${a.padEnd(28)} ${n}`);
    console.log(`\n${VERBOSE ? "all" : "first 25"} failing designs:`);
  }
  if (counts.failed || VERBOSE) for (const e of examples) console.log("  " + e);
  process.exit(counts.failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

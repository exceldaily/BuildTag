/**
 * Fit check: every template's default design, with several real-world data
 * sets, measured against its own guides. Reports anything that crosses the
 * content rect (purple), the cut-safe inset (green) or overlaps the QR block
 * (amber), and writes a contact sheet with guides on.
 *
 *   pnpm fit:check <output dir>
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import * as opentype from "opentype.js";
import sharp from "sharp";

import { TEMPLATES, renderTagSvg } from "../src/lib/tag";
import { FONTS } from "../src/lib/tag/fonts";
import { layoutTag, moduleSizeMm } from "../src/lib/tag/layout";
import { DEFAULT_PRINT_GEOMETRY } from "../src/lib/tag/render";
import { SHAPES } from "../src/lib/tag/shapes";
import { toInches } from "../src/lib/tag/sizes";
import type { FontId, TagConfig, TagData, TemplateId, TextLine } from "../src/lib/tag/types";

const ROOT = path.resolve(__dirname, "..");
const OUT = process.argv[2];
const fonts = new Map<FontId, opentype.Font>();
for (const f of Object.values(FONTS)) fonts.set(f.id, opentype.parse(readFileSync(path.join(ROOT, "public", f.file)).buffer.slice(0) as ArrayBuffer));

const DATA: Record<string, TagData> = {
  runner: { scanUrl: "https://buildtags.app/s/E6NBQHDL", year: 2000, make: "Toyota", model: "4Runner", trim: "", nickname: "4RUNNER", powerLabel: "", torqueLabel: "", modCount: 2, username: "exceldaily", socials: [] },
  supra: { scanUrl: "https://buildtags.app/s/GHS7K2P9", year: 2022, make: "Toyota", model: "GR Supra", trim: "3.0 Premium", nickname: "GHOST", powerLabel: "540 WHP", torqueLabel: "520 WTQ", modCount: 24, username: "buildtag_demo", socials: [{ public_id: "a", platform: "instagram", handle: "ghost_supra", source: "vehicle" }] },
  glide: { scanUrl: "https://buildtags.app/s/BLK7RGX4", year: 2026, make: "Harley-Davidson", model: "Road Glide", trim: "CVO", nickname: "NIGHTSHIFT", powerLabel: "128 WHP", torqueLabel: "140 WTQ", modCount: 8, username: "nightshift_rider", socials: [{ public_id: "b", platform: "instagram", handle: "nightshift_rider", source: "vehicle" }] },
};

function bbox(line: TextLine) {
  const font = fonts.get(line.font)!;
  const opts = { letterSpacing: line.letterSpacing / line.fontSize, kerning: true };
  const width = font.getAdvanceWidth(line.text, line.fontSize, opts);
  let x = line.anchor === "middle" ? line.x - width / 2 : line.anchor === "end" ? line.x - width : line.x;
  if (line.icon) x = line.anchor === "middle" ? line.x - (width + line.fontSize * 0.7 * 1.1 * 1.25) / 2 : x; // icon sits before the text
  const b = font.getPath(line.text, x, line.y, line.fontSize, opts).getBoundingBox();
  return { x1: Math.min(x, b.x1), y1: b.y1, x2: b.x2, y2: b.y2 };
}

type Issue = { tpl: string; data: string; what: string; by: number };
const issues: Issue[] = [];
const tiles: { key: string; png: Buffer }[] = [];

async function check(tpl: TemplateId, dataKey: string, data: TagData) {
  const cfg: TagConfig = TEMPLATES[tpl].build();
  const layout = layoutTag(cfg, data);
  const shape = SHAPES[cfg.shape];
  const { width: w, height: h, contentRect: c } = layout;
  const inches = toInches(cfg.size);
  const safe = DEFAULT_PRINT_GEOMETRY.safeMarginIn * (w / inches.width);
  // Cut-safe inset as a rect (for square-built shapes use the centered square).
  const box = shape.square ? (() => { const s = Math.min(w, h); return { x: (w - s) / 2, y: (h - s) / 2, w: s, h: s }; })() : { x: 0, y: 0, w, h };
  const safeRect = { x1: box.x + safe, y1: box.y + safe, x2: box.x + box.w - safe, y2: box.y + box.h - safe };
  const content = { x1: c.x, y1: c.y, x2: c.x + c.w, y2: c.y + c.h };
  const tol = 1.5; // layout units (1000 = full width)
  const add = (what: string, by: number) => { if (by > tol) issues.push({ tpl, data: dataKey, what, by: Math.round(by) }); };
  const against = (label: string, r: { x1: number; y1: number; x2: number; y2: number }, name: string) => {
    const b = r;
    add(`${name} past ${label} left`, content.x1 - b.x1);
    add(`${name} past ${label} right`, b.x2 - content.x2);
    add(`${name} past ${label} top`, content.y1 - b.y1);
    add(`${name} past ${label} bottom`, b.y2 - content.y2);
    add(`${name} past cut-safe left`, safeRect.x1 - b.x1);
    add(`${name} past cut-safe right`, b.x2 - safeRect.x2);
    add(`${name} past cut-safe top`, safeRect.y1 - b.y1);
    add(`${name} past cut-safe bottom`, b.y2 - safeRect.y2);
  };
  const qr = layout.qr ? { x1: layout.qr.frameX, y1: layout.qr.frameY, x2: layout.qr.frameX + layout.qr.frameSize, y2: layout.qr.frameY + layout.qr.frameSize } : null;
  if (qr) against("content", qr, "QR block");
  if (layout.logoBox) against("content", { x1: layout.logoBox.x, y1: layout.logoBox.y, x2: layout.logoBox.x + layout.logoBox.w, y2: layout.logoBox.y + layout.logoBox.h }, "logo");
  for (const line of layout.lines) {
    const b = bbox(line);
    against("content", b, `${line.role} "${line.text}"`);
    if (qr) {
      const overlapX = Math.min(b.x2, qr.x2) - Math.max(b.x1, qr.x1);
      const overlapY = Math.min(b.y2, qr.y2) - Math.max(b.y1, qr.y1);
      if (overlapX > tol && overlapY > tol) issues.push({ tpl, data: dataKey, what: `${line.role} "${line.text}" overlaps QR block`, by: Math.round(Math.min(overlapX, overlapY)) });
    }
  }
  const mm = moduleSizeMm(cfg, layout);
  if (dataKey === "glide") console.log(`${tpl.padEnd(10)} QR module ${mm?.toFixed(2)} mm, text scale floor hit: ${layout.qrSqueezed ? "yes" : "no"}`);
  if (layout.qrSqueezed) issues.push({ tpl, data: dataKey, what: "QR squeezed below preferred size", by: 0 });
  const textToPath = (line: TextLine): string | null => {
    const font = fonts.get(line.font)!;
    const opts = { letterSpacing: line.letterSpacing / line.fontSize, kerning: true };
    const width = font.getAdvanceWidth(line.text, line.fontSize, opts);
    const x = line.anchor === "middle" ? line.x - width / 2 : line.anchor === "end" ? line.x - width : line.x;
    return font.getPath(line.text, x, line.y, line.fontSize, opts).toPathData(3);
  };
  const { svg } = renderTagSvg(cfg, data, { material: false, guides: true, textToPath });
  const png = await sharp(Buffer.from(svg)).resize({ width: 360 }).flatten({ background: "#222" }).png().toBuffer();
  tiles.push({ key: `${tpl}/${dataKey}`, png });
}

async function main() {
  const ids = Object.keys(TEMPLATES) as TemplateId[];
  for (const tpl of ids) for (const [k, d] of Object.entries(DATA)) await check(tpl, k, d);
  // Contact sheet: one row per template, one column per data set.
  const cols = Object.keys(DATA).length;
  const rowH = 380;
  const sheet = sharp({ create: { width: cols * 380, height: ids.length * rowH, channels: 3, background: "#444" } });
  const comps: { input: Buffer; left: number; top: number }[] = [];
  for (const t of tiles) {
    const [tpl, dk] = t.key.split("/");
    const r = ids.indexOf(tpl as TemplateId);
    const cIdx = Object.keys(DATA).indexOf(dk);
    const meta = await sharp(t.png).metadata();
    const fitted = meta.height! > rowH - 20 ? await sharp(t.png).resize({ height: rowH - 20 }).png().toBuffer() : t.png;
    comps.push({ input: fitted, left: cIdx * 380 + 10, top: r * rowH + 10 });
  }
  await sheet.composite(comps).jpeg({ quality: 82 }).toFile(`${OUT}/fit-sheet.jpg`);
  console.log(`checked ${ids.length} templates x ${cols} data sets; ${issues.length} issues`);
  for (const i of issues) console.log(`${i.tpl.padEnd(10)} ${i.data.padEnd(7)} ${i.what} ${i.by ? `by ${i.by}` : ""}`);
}
main();

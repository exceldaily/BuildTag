/**
 * Social posts in the homepage look: feed (1080 x 1350), square (1080 x 1080)
 * and story (1080 x 1920). Same ingredients as the link preview: the GHOST
 * cutout, the brush wordmark and a real decal from the Designer pipeline.
 * Fonts are converted to paths, so output never depends on system fonts.
 *
 *   pnpm tsx scripts/make-social.ts <outDir>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import * as opentype from "opentype.js";
import sharp from "sharp";

import { FONTS } from "../src/lib/tag/fonts";
import { TEMPLATES, renderTagSvg } from "../src/lib/tag";
import type { FontId, TextLine } from "../src/lib/tag/types";

const ROOT = path.resolve(__dirname, "..");
const OUT = process.argv[2];
if (!OUT) throw new Error("Usage: tsx scripts/make-social.ts <outDir>");
mkdirSync(OUT, { recursive: true });

const BG = "#06050d";
const PINK = "#ff2d7a";
const ITALIC = "fonts/BarlowCondensed-SemiBoldItalic.ttf";
const BOLD = "fonts/BarlowCondensed-Bold.ttf";
const MONO = "fonts/ShareTechMono-Regular.ttf";

const fontCache = new Map<string, opentype.Font>();
function font(file: string): opentype.Font {
  let f = fontCache.get(file);
  if (!f) {
    f = opentype.parse(readFileSync(path.join(ROOT, "public", file)).buffer.slice(0) as ArrayBuffer);
    fontCache.set(file, f);
  }
  return f;
}
function textPath(file: string, text: string, x: number, y: number, size: number, letterSpacingEm = 0, anchor: "start" | "middle" | "end" = "start"): string {
  const f = font(file);
  const opts = { letterSpacing: letterSpacingEm, kerning: true };
  const width = f.getAdvanceWidth(text, size, opts);
  const sx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const d = f.getPath(text, sx, y, size, opts).toPathData(3);
  if (d.includes("NaN")) throw new Error(`Font outline failed for "${text}"`);
  return d;
}
const textToPath = (line: TextLine): string | null => textPath(FONTS[line.font as FontId].file, line.text, line.x, line.y, line.fontSize, line.letterSpacing / line.fontSize, line.anchor);

const QUESTIONS = ["“What exhaust is that?”", "“What wheels are those?”", "“How much power does it make?”", "“What all have you done to it?”"];

interface Format {
  name: string;
  w: number;
  h: number;
  /** top of the copy block */
  top: number;
  head: number;
  carW: number;
  questions: boolean;
  tag: number;
}

async function render(f: Format) {
  const { w: W, h: H } = f;
  const M = 72;

  const car = await sharp(path.join(ROOT, "public/images/home/ghost-cutout.webp")).resize({ width: f.carW }).png().toBuffer();
  const carH = (await sharp(car).metadata()).height ?? 600;
  const carX = W - f.carW + Math.round(f.carW * 0.2);
  const carY = H - carH - 150;
  const carVisible = await sharp(car).extract({ left: 0, top: 0, width: W - carX, height: carH }).png().toBuffer();

  const decal = renderTagSvg(
    TEMPLATES.power.build(),
    {
      scanUrl: "https://buildtags.app/s/GHS7K2P9",
      year: 2022,
      make: "Toyota",
      model: "GR Supra",
      trim: "3.0 Premium",
      nickname: "GHOST",
      powerLabel: "540 WHP",
      torqueLabel: "520 WTQ",
      modCount: 24,
      username: "buildtag_demo",
      socials: [],
    },
    { idPrefix: "so", mode: "export", material: false, textToPath },
  ).svg;
  const tagSize = f.tag;
  const tagFlat = await sharp(Buffer.from(decal)).resize(tagSize, tagSize, { fit: "inside" }).png().toBuffer();
  const tag = await sharp(tagFlat).rotate(-5, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const tagMeta = await sharp(tag).metadata();
  const tagX = M - 10;
  const tagY = H - (tagMeta.height ?? tagSize) - 170;

  const logo = await sharp(readFileSync(path.join(ROOT, "public/brand/logo-white.svg"))).resize({ width: 300 }).png().toBuffer();

  const grid: string[] = [];
  for (let x = 0; x <= W; x += 60) grid.push(`<path d="M${x} 0V${H}" stroke="#ffffff" stroke-opacity="${x % 240 === 0 ? 0.05 : 0.025}"/>`);
  for (let y = 0; y <= H; y += 60) grid.push(`<path d="M0 ${y}H${W}" stroke="#ffffff" stroke-opacity="${y % 240 === 0 ? 0.05 : 0.025}"/>`);

  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="light" cx="0.8" cy="${((carY + carH * 0.4) / H).toFixed(3)}" r="0.7"><stop offset="0" stop-color="#2a1430" stop-opacity="0.95"/><stop offset="0.55" stop-color="#12091d" stop-opacity="0.6"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>
    <linearGradient id="ghost" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.015"/></linearGradient>
    <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.85"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#light)"/>
  ${grid.join("")}
  <path d="${textPath(ITALIC, "GHOST", W + 40, carY + carH * 0.42, 470, -0.01, "end")}" fill="url(#ghost)"/>
  <ellipse cx="${carX + f.carW * 0.5}" cy="${carY + carH - 14}" rx="${f.carW * 0.5}" ry="40" fill="url(#floor)"/>
</svg>`;

  let y = f.top;
  const head = f.head;
  const lines: string[] = [];
  lines.push(`<path d="${textPath(MONO, "EVERY MEET. EVERY GAS STATION.", M, y, 24, 0.16)}" fill="${PINK}"/>`);
  y += head * 0.98;
  lines.push(`<path d="${textPath(ITALIC, "STOP EXPLAINING", M - 6, y, head, 0.005)}" fill="#ffffff"/>`);
  y += head * 0.88;
  lines.push(`<path d="${textPath(ITALIC, "YOUR BUILD.", M - 6, y, head, 0.005)}" fill="#ffffff"/>`);
  y += head * 0.88;
  lines.push(`<path d="${textPath(ITALIC, "TAG IT.", M - 6, y, head, 0.005)}" fill="${PINK}"/>`);
  y += 66;
  lines.push(`<path d="${textPath(BOLD, "YOUR MODS, PARTS AND SPECS. ONE SCAN.", M, y, 38, 0.07)}" fill="#ffffff" fill-opacity="0.92"/>`);
  if (f.questions) {
    y += 70;
    for (const q of QUESTIONS) {
      lines.push(`<path d="M${M} ${y - 34}H${M + 520}" stroke="#ffffff" stroke-opacity="0.14"/>`);
      lines.push(`<path d="${textPath(ITALIC, q, M, y, 36, 0.01)}" fill="#ffffff" fill-opacity="0.5"/>`);
      y += 54;
    }
  }

  const over = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG}" stop-opacity="0"/><stop offset="1" stop-color="${BG}" stop-opacity="0.96"/></linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <rect x="0" y="${H - 300}" width="${W}" height="300" fill="url(#bottom)"/>
  <ellipse cx="${tagX + (tagMeta.width ?? tagSize) / 2 + 10}" cy="${tagY + (tagMeta.height ?? tagSize) - 4}" rx="${tagSize * 0.5}" ry="20" fill="#000" opacity="0.75" filter="url(#soft)"/>
  ${lines.join("\n  ")}
  <!-- footer -->
  <path d="M${M} ${H - 118}H${W - M}" stroke="#ffffff" stroke-opacity="0.22"/>
  <path d="${textPath(BOLD, "CREATE YOUR BUILD", M, H - 62, 40, 0.1)}" fill="#ffffff"/>
  <path d="${textPath(MONO, "BUILDTAGS.APP", W - M, H - 64, 30, 0.14, "end")}" fill="${PINK}"/>
  <!-- frame corner -->
  <path d="M${W - 56} 56 h-44 M${W - 56} 56 v44" fill="none" stroke="${PINK}" stroke-width="3"/>
</svg>`;

  const out = await sharp(Buffer.from(base))
    .composite([
      { input: carVisible, top: carY, left: carX },
      { input: Buffer.from(over), top: 0, left: 0 },
      { input: tag, top: tagY, left: tagX },
      { input: logo, top: 64, left: M - 4 },
    ])
    .png()
    .toBuffer();
  const file = path.join(OUT, `buildtags-${f.name}.jpg`);
  writeFileSync(file, await sharp(out).jpeg({ quality: 92, mozjpeg: true }).toBuffer());
  console.log(file, `${W}x${H}`);
}

async function main() {
  await render({ name: "feed-1080x1350", w: 1080, h: 1350, top: 250, head: 150, carW: 980, questions: false, tag: 300 });
  await render({ name: "square-1080x1080", w: 1080, h: 1080, top: 205, head: 116, carW: 720, questions: false, tag: 220 });
  await render({ name: "story-1080x1920", w: 1080, h: 1920, top: 330, head: 158, carW: 1180, questions: true, tag: 300 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

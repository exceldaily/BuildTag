/**
 * Builds the default link preview (public/og.png, 1200x630) in the same
 * editorial style as the homepage: the GHOST cutout breaking out of the
 * frame, the brush wordmark, hairline annotations and a physical tag
 * rendered by the Designer pipeline. Fonts are converted to paths so the
 * output never depends on system fonts.
 *
 *   pnpm og
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import * as opentype from "opentype.js";
import sharp from "sharp";

import { FONTS } from "../src/lib/tag/fonts";
import { TEMPLATES, renderTagSvg } from "../src/lib/tag";
import type { FontId, TextLine } from "../src/lib/tag/types";

const ROOT = path.resolve(__dirname, "..");
const W = 1200;
const H = 630;
const BG = "#06050d";
const PINK = "#ff2d7a";

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

const textToPath = (line: TextLine): string | null => {
  const id = line.font as FontId;
  return textPath(FONTS[id].file, line.text, line.x, line.y, line.fontSize, line.letterSpacing / line.fontSize, line.anchor);
};

async function main() {
  const italic = "fonts/BarlowCondensed-SemiBoldItalic.ttf";
  const bold = "fonts/BarlowCondensed-Bold.ttf";
  const mono = "fonts/ShareTechMono-Regular.ttf";

  // The car: GHOST cutout, large, running off the right edge.
  const carW = 800;
  const car = await sharp(path.join(ROOT, "public/images/home/ghost-cutout.webp")).resize({ width: carW }).png().toBuffer();
  const carMeta = await sharp(car).metadata();
  const carH = carMeta.height ?? 520;
  const carX = W - carW + 190;
  const carY = H - carH - 8;
  const carVisible = await sharp(car).extract({ left: 0, top: 0, width: W - carX, height: carH }).png().toBuffer();

  // Physical tag from the Designer pipeline.
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
      socials: [{ public_id: "demo", platform: "instagram", handle: "ghost_supra", source: "vehicle" }],
    },
    { idPrefix: "og", mode: "export", material: false, textToPath },
  ).svg;
  const tagSize = 190;
  const tagFlat = await sharp(Buffer.from(decal)).resize(tagSize, tagSize, { fit: "inside" }).png().toBuffer();
  const tag = await sharp(tagFlat).rotate(-5, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const tagMeta = await sharp(tag).metadata();
  const tagX = 960;
  const tagY = H - (tagMeta.height ?? tagSize) - 40;

  const logo = await sharp(readFileSync(path.join(ROOT, "public/brand/logo-white.svg"))).resize({ width: 250 }).png().toBuffer();

  const grid: string[] = [];
  for (let x = 0; x <= W; x += 60) grid.push(`<path d="M${x} 0V${H}" stroke="#ffffff" stroke-opacity="${x % 240 === 0 ? 0.05 : 0.025}"/>`);
  for (let y = 0; y <= H; y += 60) grid.push(`<path d="M0 ${y}H${W}" stroke="#ffffff" stroke-opacity="${y % 240 === 0 ? 0.05 : 0.025}"/>`);

  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="light" cx="0.74" cy="0.5" r="0.62"><stop offset="0" stop-color="#2a1430" stop-opacity="0.95"/><stop offset="0.55" stop-color="#12091d" stop-opacity="0.6"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>
    <linearGradient id="ghost" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.085"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.015"/></linearGradient>
    <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.85"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#light)"/>
  ${grid.join("")}
  <!-- giant type behind the car -->
  <path d="${textPath(italic, "GHOST", 1230, 330, 400, -0.01, "end")}" fill="url(#ghost)"/>
  <!-- ground shadow -->
  <ellipse cx="${carX + carW * 0.5}" cy="${H - 34}" rx="${carW * 0.48}" ry="34" fill="url(#floor)"/>
</svg>`;

  const over = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="left" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${BG}" stop-opacity="0.92"/><stop offset="0.46" stop-color="${BG}" stop-opacity="0.8"/><stop offset="0.66" stop-color="${BG}" stop-opacity="0"/></linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#left)"/>
  <!-- tag contact shadow -->
  <ellipse cx="${tagX + (tagMeta.width ?? tagSize) / 2 + 8}" cy="${tagY + (tagMeta.height ?? tagSize) - 6}" rx="${tagSize * 0.5}" ry="16" fill="#000" opacity="0.7" filter="url(#soft)"/>

  <!-- eyebrow -->
  <path d="${textPath(mono, "BUILD PROFILE / 001", 72, 196, 19, 0.16)}" fill="${PINK}"/>
  <!-- headline -->
  <path d="${textPath(italic, "STOP EXPLAINING", 66, 292, 96, 0.005)}" fill="#ffffff"/>
  <path d="${textPath(italic, "YOUR BUILD.", 66, 384, 96, 0.005)}" fill="#ffffff"/>
  <path d="${textPath(italic, "TAG IT.", 66, 476, 96, 0.005)}" fill="#cfc8e8"/>
  <!-- sub + url -->
  <path d="${textPath(bold, "YOUR MODS, PARTS AND SPECS. ONE SCAN.", 72, 528, 27, 0.08)}" fill="#ffffff" fill-opacity="0.9"/>
  <path d="M72 560H420" stroke="${PINK}" stroke-width="2"/>
  <path d="${textPath(mono, "BUILDTAGS.APP", 72, 592, 20, 0.16)}" fill="#ffffff" fill-opacity="0.8"/>

  <!-- hairline annotation on the car -->
  <path d="M850 262 L920 150 H1090" fill="none" stroke="#ffffff" stroke-opacity="0.55"/>
  <circle cx="850" cy="262" r="5" fill="none" stroke="${PINK}" stroke-width="1.5"/>
  <path d="${textPath(mono, "01 / POWER", 926, 136, 15, 0.16)}" fill="${PINK}"/>
  <path d="${textPath(bold, "540 WHP", 926, 188, 36, 0.04)}" fill="#ffffff"/>
  <path d="${textPath(bold, "24 MODS", 926, 222, 28, 0.04)}" fill="#ffffff" fill-opacity="0.8"/>
  <!-- frame corner -->
  <path d="M${W - 44} 40 h-34 M${W - 44} 40 v34" fill="none" stroke="${PINK}" stroke-width="2"/>
</svg>`;

  const out = await sharp(Buffer.from(base))
    .composite([
      { input: carVisible, top: carY, left: carX },
      { input: Buffer.from(over), top: 0, left: 0 },
      { input: tag, top: tagY, left: tagX },
      { input: logo, top: 58, left: 66 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(path.join(ROOT, "public/og.png"), out);
  // The JPEG is what pages reference: a third of the weight, which chat apps need.
  const jpg = await sharp(out).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  writeFileSync(path.join(ROOT, "public/og.jpg"), jpg);
  console.log(`public/og.jpg (${Math.round(jpg.length / 1024)} KB)`);
  const meta = await sharp(out).metadata();
  console.log(`public/og.png ${meta.width}x${meta.height} (${Math.round(out.length / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

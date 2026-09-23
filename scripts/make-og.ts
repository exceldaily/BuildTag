/**
 * Builds the social share image (public/og.png, 1200x630) from the real
 * homepage photo, the traced logo, and a decal rendered by the same
 * pipeline the Designer uses. Fonts are converted to paths so the output
 * never depends on system fonts.
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
  // Photo, cropped to the share aspect and darkened toward the left.
  const photo = await sharp(path.join(ROOT, "public/images/home/hero-drift.webp"))
    .resize(W, H, { fit: "cover", position: "attention" })
    .modulate({ brightness: 0.82, saturation: 1.15 })
    .toBuffer();

  // Decal from the Designer pipeline (Power template, sample Supra).
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
  const decalPng = await sharp(Buffer.from(decal)).resize(330, 330, { fit: "inside" }).png().toBuffer();
  const decalMeta = await sharp(decalPng).metadata();
  const decalW = decalMeta.width ?? 330;
  const decalH = decalMeta.height ?? 330;
  const decalX = W - decalW - 86;
  const decalY = Math.round((H - decalH) / 2);

  const logoSvg = readFileSync(path.join(ROOT, "public/brand/logo-white.svg"));
  const logoPng = await sharp(logoSvg).resize({ width: 300 }).png().toBuffer();
  const logoMeta = await sharp(logoPng).metadata();

  const condensed = "fonts/BarlowCondensed-Bold.ttf";
  const tech = "fonts/Rajdhani-Bold.ttf";

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#06050d" stop-opacity="0.96"/>
      <stop offset="0.55" stop-color="#06050d" stop-opacity="0.72"/>
      <stop offset="1" stop-color="#06050d" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.6" stop-color="#06050d" stop-opacity="0"/>
      <stop offset="1" stop-color="#06050d" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <rect width="${W}" height="${H}" fill="url(#bottom)"/>
  <!-- neon streaks -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="#ff2d7a"/>
  <rect x="0" y="${H - 6}" width="${Math.round(W * 0.38)}" height="6" fill="#1fd8ff"/>
  <!-- decal glow -->
  <rect x="${decalX - 10}" y="${decalY - 10}" width="${decalW + 20}" height="${decalH + 20}" rx="18" fill="#ff2d7a" opacity="0.55" filter="url(#glow)"/>
  <!-- eyebrow -->
  <path d="${textPath(tech, "SCAN THE BUILD.", 84, 236, 26, 0.32)}" fill="#ff2d7a"/>
  <!-- headline -->
  <path d="${textPath(condensed, "YOUR BUILD", 80, 336, 112)}" fill="#ffffff"/>
  <path d="${textPath(condensed, "DESERVES", 80, 432, 112)}" fill="#ffffff"/>
  <path d="${textPath(condensed, "A SPEC SHEET.", 80, 528, 112)}" fill="#1fd8ff"/>
  <!-- url -->
  <path d="${textPath(condensed, "BUILDTAGS.APP", 82, 586, 40, 0.06)}" fill="#ff2d7a"/>
</svg>`;

  const out = await sharp(photo)
    .composite([
      { input: Buffer.from(overlay), top: 0, left: 0 },
      { input: logoPng, top: 64, left: 80 - Math.round(((logoMeta.width ?? 300) - 300) / 2) },
      { input: decalPng, top: decalY, left: decalX },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(path.join(ROOT, "public/og.png"), out);
  const meta = await sharp(out).metadata();
  console.log(`public/og.png ${meta.width}x${meta.height} (${Math.round(out.length / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

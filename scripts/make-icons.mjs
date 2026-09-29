import { writeFileSync } from "node:fs";

import potrace from "potrace";
import sharp from "sharp";

/**
 * PWA + browser icons from the brush lettering (public/brand/btag-mark.webp).
 *
 *   - App icons (192, 512, maskable, apple-touch): the Btag mark in white on
 *     the brand's near-black tile with a pink underline stroke.
 *   - Browser tab icons (32, 64, icon.svg): the brush "B" alone, because four
 *     letters turn to mush at 16 to 32 px.
 *
 *   pnpm icons
 */
const SRC = "public/brand/btag-mark.webp";
const BG = "#06050d";
const PINK = "#ff2d7a";

/** White ink as a grayscale mask, trimmed to the lettering. */
async function inkMask() {
  const { data, info } = await sharp(SRC).flatten({ background: "#000" }).grayscale().trim({ background: "#000000", threshold: 40 }).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** The "B": left part of the mark, largest connected blob only (drops the strokes of the "t" that lean in). */
function isolateB(mask) {
  const w = Math.round(mask.width * 0.47);
  const h = mask.height;
  const on = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) on[y * w + x] = mask.data[y * mask.width + x] > 128 ? 1 : 0;
  const label = new Int32Array(w * h);
  let best = 0;
  let bestSize = 0;
  let next = 0;
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (!on[i] || label[i]) continue;
    next++;
    let size = 0;
    stack.push(i);
    label[i] = next;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % w;
      const y = (p - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (on[q] && !label[q]) {
          label[q] = next;
          stack.push(q);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = next;
    }
  }
  const out = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) out[i] = label[i] === best ? mask.data[Math.floor(i / w) * mask.width + (i % w)] : 0;
  return { data: out, width: w, height: h };
}

/** Grayscale ink mask -> white RGBA artwork, trimmed. */
async function whiteArt(mask) {
  const alpha = await sharp(mask.data, { raw: { width: mask.width, height: mask.height, channels: 1 } }).png().toBuffer();
  const art = await sharp({ create: { width: mask.width, height: mask.height, channels: 3, background: "#ffffff" } }).joinChannel(alpha).png().toBuffer();
  return sharp(art).trim({ threshold: 1 }).png().toBuffer();
}

async function tile({ size, art, inner, out, radius = 0, underline = true }) {
  const fitted = await sharp(art).resize(Math.round(size * inner), Math.round(size * inner), { fit: "inside" }).png().toBuffer();
  const m = await sharp(fitted).metadata();
  const left = Math.round((size - m.width) / 2);
  const top = Math.round((size - m.height) / 2 - (underline ? size * 0.03 : 0));
  const r = Math.round(size * radius);
  const barW = Math.round(m.width * 0.62);
  const barH = Math.max(2, Math.round(size * 0.028));
  const barY = Math.min(size - barH - 2, top + m.height + Math.round(size * 0.05));
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><radialGradient id="g" cx="0.2" cy="1" r="1"><stop offset="0" stop-color="${PINK}" stop-opacity="0.28"/><stop offset="0.6" stop-color="${PINK}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="${BG}"/>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
    ${underline ? `<path d="M ${left} ${barY + barH} L ${left + barH * 1.2} ${barY} L ${left + barW} ${barY} L ${left + barW - barH * 1.2} ${barY + barH} Z" fill="${PINK}"/>` : ""}
  </svg>`;
  await sharp(Buffer.from(bg)).composite([{ input: fitted, left, top }]).png().toFile(out);
}

const mask = await inkMask();
const btag = await whiteArt(mask);
const bMask = isolateB(mask);
const b = await whiteArt(bMask);

// App icons: full mark. Maskable keeps the artwork inside the 80% safe zone.
await tile({ size: 192, art: btag, inner: 0.78, out: "public/icons/icon-192.png" });
await tile({ size: 512, art: btag, inner: 0.78, out: "public/icons/icon-512.png" });
await tile({ size: 512, art: btag, inner: 0.6, out: "public/icons/icon-maskable-512.png" });
await tile({ size: 180, art: btag, inner: 0.78, out: "public/icons/apple-touch-icon.png" });

// Browser tab: the B alone, rounded tile, no underline (too fine at this size).
await tile({ size: 32, art: b, inner: 0.84, out: "public/icons/favicon-32.png", radius: 0.2, underline: false });
await tile({ size: 64, art: b, inner: 0.84, out: "src/app/icon.png", radius: 0.2, underline: false });

// Vector B for the offline page and anything that wants an SVG.
const bForTrace = await sharp(bMask.data, { raw: { width: bMask.width, height: bMask.height, channels: 1 } }).negate().png().toBuffer();
const traced = await new Promise((resolve, reject) => potrace.trace(bForTrace, { threshold: 128, turdSize: 12, optTolerance: 0.4 }, (err, svg) => (err ? reject(err) : resolve(svg))));
const d = /<path[^>]*\sd="([^"]+)"/.exec(traced)[1].replace(/\s+/g, " ").trim();
const s = 46 / Math.max(bMask.width, bMask.height);
const tx = (64 - bMask.width * s) / 2;
const ty = (64 - bMask.height * s) / 2;
writeFileSync(
  "public/icons/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="13" fill="${BG}"/><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})"><path d="${d}" fill="#fff" fill-rule="evenodd"/></g></svg>\n`,
);
console.log("icons ok");

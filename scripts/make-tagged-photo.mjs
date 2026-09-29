/**
 * Builds the "tag on the glass" campaign photo for the homepage from the
 * BLUEBERRY demo WRX (public/demo/sti): crops to the rear half of the car and
 * cleans the two window patches where third-party stickers were blurred out,
 * so the BuildTag can sit on the rear quarter glass.
 *
 *   node scripts/make-tagged-photo.mjs
 */
import sharp from "sharp";

const SRC = "public/demo/sti/full.webp";
const OUT = "public/images/home/tagged-wrx.webp";

// Working frame inside the 2000 x 1333 source, then fractions of that frame.
const FRAME = { left: 80, top: 267, width: 1240, height: 800 };
const px = (b) => ({ left: Math.round(FRAME.left + b.x * FRAME.width), top: Math.round(FRAME.top + b.y * FRAME.height), width: Math.round(b.w * FRAME.width), height: Math.round(b.h * FRAME.height) });

const PATCHES = [
  { x: 0.235, y: 0.265, w: 0.105, h: 0.13 },
  { x: 0.385, y: 0.29, w: 0.125, h: 0.13 },
];
const CLEAN_GLASS = { x: 0.335, y: 0.29, w: 0.06, h: 0.07 };
const CROP = { x: 0.1, y: 0.08, w: 0.65, h: 0.8 };

const src = sharp(SRC);
const glass = await src.clone().extract(px(CLEAN_GLASS)).blur(8).toBuffer();
const overlays = [];
for (const p of PATCHES) {
  const r = px(p);
  const fill = await sharp(glass).resize(r.width, r.height, { fit: "fill" }).blur(6).toBuffer();
  // feathered edge so the patch melts into the glass
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}"><defs><filter id="f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${r.width * 0.07}"/></filter></defs><rect x="${r.width * 0.2}" y="${r.height * 0.2}" width="${r.width * 0.6}" height="${r.height * 0.6}" rx="${r.width * 0.1}" fill="#fff" filter="url(#f)"/></svg>`);
  const input = await sharp(fill).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  overlays.push({ input, left: r.left, top: r.top });
}
const cleaned = await src.clone().composite(overlays).png().toBuffer();
await sharp(cleaned).extract(px(CROP)).webp({ quality: 82 }).toFile(OUT);
const m = await sharp(OUT).metadata();
console.log(OUT, m.width, m.height);

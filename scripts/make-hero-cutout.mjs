/**
 * Builds the transparent hero cutout of the GHOST demo Supra from its demo
 * photo (public/demo/ghost-1/full.webp, Unsplash): a hand-traced silhouette
 * polygon, feathered, applied as an alpha mask.
 *
 *   node scripts/make-hero-cutout.mjs [--check]
 *
 * Writes public/images/home/ghost-cutout.webp (1400w) and ghost-cutout-800.webp.
 * --check also writes a preview over bright pink to inspect edge halos.
 */
import sharp from "sharp";

const SRC = "public/demo/ghost-1/full.webp";
// Crop window in source pixels (the trace was made on this window at 0.8x).
const X0 = 150;
const Y0 = 880;
const W = 1700;
const H = 1080;
const S = 0.8;

// Silhouette, clockwise from the roof, in trace (0.8x) coordinates.
const TRACE = [
  // roof
  [385, 80], [470, 72], [680, 67], [880, 72], [950, 86],
  // right windshield frame
  [978, 112], [1003, 152], [1030, 200], [1050, 228],
  // right mirror
  [1062, 182], [1130, 178], [1190, 195], [1202, 225], [1178, 250], [1100, 252], [1070, 245],
  // right fender and bumper
  [1112, 258], [1172, 282], [1222, 328], [1254, 385], [1274, 445], [1282, 515], [1285, 600], [1283, 680], [1278, 745], [1270, 790],
  // front lip
  [1200, 800], [1000, 806], [680, 808], [360, 806], [160, 800], [85, 792],
  // left bumper and fender
  [72, 745], [64, 680], [60, 600], [62, 515], [70, 445], [84, 388], [108, 332], [150, 288], [212, 262],
  // left mirror
  [262, 250], [232, 254], [158, 250], [135, 225], [145, 198], [200, 187], [266, 192],
  // left windshield frame
  [282, 215], [305, 170], [330, 130], [355, 100],
];

const points = TRACE.map(([x, y]) => `${(x / S).toFixed(1)},${(y / S).toFixed(1)}`).join(" ");
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="black"/><polygon points="${points}" fill="white"/></svg>`;

const check = process.argv.includes("--check");

const mask = await sharp(Buffer.from(maskSvg)).blur(2.2).extractChannel(0).toBuffer();
const rgb = await sharp(SRC).extract({ left: X0, top: Y0, width: W, height: H }).removeAlpha().toBuffer();
const cut = await sharp(rgb).joinChannel(mask).png().toBuffer();

// Trim transparent margin so layout math uses the car's real bounds.
const trimmed = await sharp(cut).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
console.log("trimmed", trimmed.info.width, "x", trimmed.info.height);

await sharp(trimmed.data).resize({ width: 1400 }).webp({ quality: 84, alphaQuality: 90 }).toFile("public/images/home/ghost-cutout.webp");
await sharp(trimmed.data).resize({ width: 800 }).webp({ quality: 82, alphaQuality: 90 }).toFile("public/images/home/ghost-cutout-800.webp");

if (check) {
  const meta = await sharp(trimmed.data).metadata();
  const flat = await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: "#ff2d7a" } })
    .composite([{ input: trimmed.data }])
    .png()
    .toBuffer();
  await sharp(flat)
    .resize({ width: 1300 })
    .jpeg({ quality: 88 })
    .toFile(process.argv[process.argv.indexOf("--check") + 1] || "cutout-check.jpg");
}
console.log("done");

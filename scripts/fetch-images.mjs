/**
 * Downloads the stock photography used on the homepage and by the demo
 * vehicle, converting to WebP. All photos are from Unsplash under the
 * Unsplash License (free to use, no attribution required; credited anyway).
 *
 *   pnpm images
 *
 * Homepage images land in public/images/home, demo vehicle photos in
 * public/demo/<name>/{full,thumb}.webp (mirrors the storage layout).
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const UNSPLASH = "https://images.unsplash.com";

export const HOME_IMAGES = [
  { name: "hero-drift", id: "photo-1555532686-d0fccaccadcf", page: "https://unsplash.com/photos/b6f7WaA-NZk", width: 2400, alt: "Supercar drifting through neon-lit city streets at night" },
  { name: "rolling-e30", id: "photo-1711959734370-5a82b321ea3e", page: "https://unsplash.com/photos/2GCDiRsKfUQ", width: 1800, alt: "Yellow BMW E30 rolling shot through a lit-up street at night" },
  { name: "meet-crowd", id: "photo-1741365703820-b64e17ba703f", page: "https://unsplash.com/photos/G3A2rjZzTmQ", width: 1800, alt: "Cars and people gathered at a night car meet" },
  { name: "tunnel-gt3", id: "photo-1658187767506-51680af8b85f", page: "https://unsplash.com/photos/oNLz76npKeM", width: 1800, alt: "Lime green Porsche GT3 in a tunnel at night" },
  { name: "lineup", id: "photo-1759855714726-2b5da0aa20c0", page: "https://unsplash.com/photos/VzpQ-P1fqwM", width: 1800, alt: "Modified cars parked at night under streetlights" },
  { name: "garage-86", id: "photo-1749498793665-28a97caa1a8c", page: "https://unsplash.com/photos/DnNvKBxHptc", width: 1800, alt: "White Toyota 86 parked inside a garage" },
  { name: "hood-open", id: "photo-1749498701707-d824aedfea3d", page: "https://unsplash.com/photos/kJXg77YKqz4", width: 1800, alt: "Blue Subaru with its hood open at a meet" },
  { name: "fog-lights", id: "photo-1613713568305-8da2fc04f168", page: "https://unsplash.com/photos/wGs6Ffd44lc", width: 2400, alt: "Car headlights cutting through fog on a dark road" },
];

export const DEMO_IMAGES = [
  { name: "ghost-1", id: "photo-1631858109510-685566373403", page: "https://unsplash.com/photos/SBN-TEfHalA", alt: "White Toyota GR Supra at a night car meet" },
  { name: "ghost-2", id: "photo-1713311092670-cec9e0d35d60", page: "https://unsplash.com/photos/5PibFLH65A4", alt: "White GR Supra parked among cars under palm trees at night" },
  { name: "ghost-3", id: "photo-1557775209-c50f9bc881ad", page: "https://unsplash.com/photos/mpt0txRKmM0", alt: "Close-up of a gray GR Supra headlight and fender" },
];

async function fetchBuffer(id, width) {
  const res = await fetch(`${UNSPLASH}/${id}?w=${width}&q=82&fm=jpg&fit=max`);
  if (!res.ok) throw new Error(`${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

mkdirSync("public/images/home", { recursive: true });
for (const img of HOME_IMAGES) {
  const buf = await fetchBuffer(img.id, img.width);
  await sharp(buf).webp({ quality: 80 }).toFile(`public/images/home/${img.name}.webp`);
  console.log("home", img.name);
}

for (const img of DEMO_IMAGES) {
  const dir = `public/demo/${img.name}`;
  mkdirSync(dir, { recursive: true });
  const buf = await fetchBuffer(img.id, 2000);
  await sharp(buf).resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(`${dir}/full.webp`);
  await sharp(buf).resize({ width: 640 }).webp({ quality: 76 }).toFile(`${dir}/thumb.webp`);
  console.log("demo", img.name);
}

writeFileSync(
  "public/images/CREDITS.md",
  `# Photo credits\n\nAll photography via Unsplash (https://unsplash.com/license).\n\n${[...HOME_IMAGES, ...DEMO_IMAGES].map((i) => `- ${i.name}: ${i.page}`).join("\n")}\n`,
);
console.log("done");

/**
 * Downloads the stock photography used on the homepage and by the demo
 * vehicle, converting to WebP. All photos are from Unsplash under the
 * Unsplash License (free to use, no attribution required; credited anyway).
 *
 *   pnpm images          (everything)
 *   pnpm images moto     (only names starting with "moto")
 *
 * Homepage images land in public/images/home, demo vehicle photos in
 * public/demo/<name>/{full,thumb}.webp (mirrors the storage layout).
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

import { GHOST1_STICKER, removeDecal } from "./retouch.mjs";

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
  // Motorcycles (BuildTag is pitched to bike shops too)
  { name: "moto-city-night", id: "photo-1720401110107-bc052557f613", page: "https://unsplash.com/photos/WyejKgcq4t8", width: 1800, alt: "Rider on a sport bike blasting through a city street at night" },
  { name: "moto-bike-week", id: "photo-1783376751842-bbca196195c5", page: "https://unsplash.com/photos/ei5XUjkH0aw", width: 1800, alt: "Crowded street packed with motorcycles and people at Daytona Bike Week" },
  { name: "moto-panigale", id: "photo-1698695290237-5c7be2bd52a8", page: "https://unsplash.com/photos/c2cW2tSSvRc", width: 1800, alt: "Red Ducati Panigale parked on a city street at night" },
  { name: "moto-shop", id: "photo-1758887699124-a9e8763d9289", page: "https://unsplash.com/photos/Uz1yD4eIfY8", width: 1800, alt: "Black Aprilia sport bike on a paddock stand with tire warmers inside a garage" },
  { name: "moto-r1-rolling", id: "photo-1606927131353-c0ad17d60b56", page: "https://unsplash.com/photos/_MkukMMe36E", width: 1800, alt: "Yamaha R1 rolling shot under city lights at night" },
];

export const DEMO_IMAGES = [
  { name: "ghost-1", id: "photo-1631858109510-685566373403", page: "https://unsplash.com/photos/SBN-TEfHalA", alt: "White Toyota GR Supra at a night car meet", retouch: GHOST1_STICKER },
  { name: "ghost-2", id: "photo-1713311092670-cec9e0d35d60", page: "https://unsplash.com/photos/5PibFLH65A4", alt: "White GR Supra parked among cars under palm trees at night" },
  { name: "ghost-3", id: "photo-1557775209-c50f9bc881ad", page: "https://unsplash.com/photos/mpt0txRKmM0", alt: "Close-up of a gray GR Supra headlight and fender" },
  // Demo bike "ROSSO" (Ducati Panigale V2), one shoot so the three photos match
  { name: "rosso-1", id: "photo-1615172282427-9a57ef2d142e", page: "https://unsplash.com/photos/wb6dyvkqpyo", alt: "Red Ducati Panigale V2 parked inside a lit pedestrian tunnel" },
  { name: "rosso-2", id: "photo-1615812309036-e3aeba454bba", page: "https://unsplash.com/photos/BIztIhCOVOc", alt: "Red Ducati Panigale V2 framed by the mouth of a concrete tunnel" },
  { name: "rosso-3", id: "photo-1615812595024-43ac7a9c0586", page: "https://unsplash.com/photos/8m_S9Pi6a1I", alt: "Close-up of the Panigale V2 tail and rear wheel" },
  // Demo bagger "DUSK" (Street Glide)
  { name: "dusk-1", id: "photo-1597171731775-4552eff4c815", page: "https://unsplash.com/photos/h_fK5Nxsth8", alt: "Black and gray CVO Street Glide bagger parked on a road at sunset" },
  // Fictional BuildTags Business demo "Blackline Performance" (stand-in photo, plate blurred)
  {
    name: "blackline-1",
    id: "photo-1519714462216-1eb4089fd8d3",
    page: "https://unsplash.com/photos/3F40IzoHjG0",
    alt: "Black touring bagger parked on a pier at dusk",
    blur: [{ left: 0.555, top: 0.7, width: 0.095, height: 0.065 }],
  },
  // Example community builds (scripts/make-demo-builds.mjs). cropY: portrait shots are cut to 3:2 around the vehicle; plates are blurred.
  { name: "whiteout", id: "photo-1692807381316-e51140a7a00f", page: "https://unsplash.com/photos/f0RvFtvVWjw", alt: "White lifted Ram 2500 on polished wheels in a wet parking lot" },
  { name: "cheeto", id: "photo-1608234493333-09825469ab3b", page: "https://unsplash.com/photos/28j19Q5gQFk", alt: "Orange lifted Toyota Tacoma on mud tires beside railroad tracks" },
  { name: "trailhead", id: "photo-1636138103588-ae927bfe10aa", page: "https://unsplash.com/photos/t5_saablH-c", alt: "Jeep Wrangler with roof lights and a rooftop tent at sunset" },
  { name: "raptor", id: "photo-1644902166413-b883bc021fd1", page: "https://unsplash.com/photos/ZMStl-plpCE", alt: "White Ford F-150 Raptor parked on red dirt under storm clouds", cropY: 0.58, blur: [{"left":0.25,"top":0.455,"width":0.045,"height":0.065}] },
  { name: "silverado", id: "photo-1765679244145-9c36a8846daa", page: "https://unsplash.com/photos/ejWPssfH0xs", alt: "Dark red Chevrolet Silverado on a leaf covered dirt road", cropY: 0.47, blur: [{"left":0.705,"top":0.69,"width":0.08,"height":0.065}] },
  { name: "ctr", id: "photo-1686074449582-6374eaebacf3", page: "https://unsplash.com/photos/FmUNQxq9Isc", alt: "Sonic Gray Honda Civic Type R on bronze wheels parked on a beach", cropY: 0.6 },
  { name: "sti", id: "photo-1606271463681-e350d3038a2c", page: "https://unsplash.com/photos/MzZAn9GxPLU", alt: "Blue Subaru WRX with a rear wing and polished wheels in a parking garage", blur: [{"left":0.82,"top":0.6,"width":0.065,"height":0.075},{"left":0.298,"top":0.395,"width":0.045,"height":0.04},{"left":0.2,"top":0.375,"width":0.04,"height":0.055}] },
  { name: "mustang", id: "photo-1649274749460-5851a718dd2a", page: "https://unsplash.com/photos/D4MiC1dNpHg", alt: "Orange Ford Mustang GT on gray wheels on a tree lined road" },
  { name: "nismo", id: "photo-1647943093662-9ac4566c2f29", page: "https://unsplash.com/photos/0fm2TsorGhY", alt: "White Nissan 370Z NISMO on bronze wheels between two industrial buildings" },
  { name: "m3", id: "photo-1607853554439-0069ec0f29b6", page: "https://unsplash.com/photos/94lAQc7ipNg", alt: "Gray BMW M3 on black wheels parked on a forest road covered in autumn leaves", cropY: 0.57, blur: [{"left":0.21,"top":0.55,"width":0.115,"height":0.05}] },
  { name: "miata", id: "photo-1722553708493-5a22cfdac07f", page: "https://unsplash.com/photos/GyZSMud-hQY", alt: "Red first generation Mazda Miata with pop-up headlights on in heavy rain at night", blur: [{"left":0.295,"top":0.745,"width":0.042,"height":0.045}] },
  { name: "scat", id: "photo-1612813562440-f3f455f77bf7", page: "https://unsplash.com/photos/-Wzkh12-2nY", alt: "Gray Dodge Challenger Scat Pack Widebody parked beside a stone building", cropY: 0.78 },
  { name: "r6", id: "photo-1660725997525-3cee7da82aec", page: "https://unsplash.com/photos/u41pGFqExG4", alt: "Black Yamaha YZF-R6 parked in front of snow capped mountains", cropY: 0.47 },
  { name: "ninja", id: "photo-1597497287565-a38cfaa4e762", page: "https://unsplash.com/photos/gbqOm5L5vFc", alt: "Black Kawasaki Ninja 400 with an aftermarket exhaust in front of palm trees", cropY: 0.5 },
  { name: "iron", id: "photo-1670995959544-9c6602da7345", page: "https://unsplash.com/photos/vtSMC0eYr34", alt: "Matte black Harley-Davidson Iron 883 parked by a brick wall" },
];

/** Cuts a portrait photo down to 3:2 landscape, centered on cropY (fraction of the height). */
async function cropLandscape(buf, cropY) {
  const { width, height } = await sharp(buf).metadata();
  const h = Math.round(width * 0.667);
  const top = Math.max(0, Math.min(height - h, Math.round(height * cropY - h / 2)));
  return sharp(buf).extract({ left: 0, top, width, height: h }).jpeg({ quality: 92 }).toBuffer();
}

async function fetchBuffer(id, width) {
  const res = await fetch(`${UNSPLASH}/${id}?w=${width}&q=82&fm=jpg&fit=max`);
  if (!res.ok) throw new Error(`${id}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Pixelate + blur boxes (fractions of the image) so plates never ship readable. */
async function blurRegions(buf, boxes) {
  const { width, height } = await sharp(buf).metadata();
  const overlays = [];
  for (const b of boxes) {
    const region = { left: Math.round(b.left * width), top: Math.round(b.top * height), width: Math.round(b.width * width), height: Math.round(b.height * height) };
    const input = await sharp(buf).extract(region).resize(8, 4).resize(region.width, region.height, { kernel: "nearest" }).blur(6).toBuffer();
    overlays.push({ input, left: region.left, top: region.top });
  }
  return sharp(buf).composite(overlays).jpeg({ quality: 92 }).toBuffer();
}

const only = process.argv[2] ?? "";
mkdirSync("public/images/home", { recursive: true });
for (const img of HOME_IMAGES) {
  if (only && !img.name.startsWith(only)) continue;
  const buf = await fetchBuffer(img.id, img.width);
  await sharp(buf).webp({ quality: 80 }).toFile(`public/images/home/${img.name}.webp`);
  console.log("home", img.name);
}

for (const img of DEMO_IMAGES) {
  if (only && !only.split(",").some((p) => img.name.startsWith(p))) continue;
  const dir = `public/demo/${img.name}`;
  mkdirSync(dir, { recursive: true });
  let buf = await fetchBuffer(img.id, 2000);
  if (img.cropY) buf = await cropLandscape(buf, img.cropY);
  if (img.blur) buf = await blurRegions(buf, img.blur);
  // Third-party decals (e.g. the M Performance hood sticker on GHOST) are retouched out.
  if (img.retouch) buf = await removeDecal(buf, img.retouch);
  await sharp(buf).resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(`${dir}/full.webp`);
  await sharp(buf).resize({ width: 640 }).webp({ quality: 76 }).toFile(`${dir}/thumb.webp`);
  console.log("demo", img.name);
}

writeFileSync(
  "public/images/CREDITS.md",
  `# Photo credits\n\nAll photography via Unsplash (https://unsplash.com/license).\n\n${[...HOME_IMAGES, ...DEMO_IMAGES].map((i) => `- ${i.name}: ${i.page}`).join("\n")}\n`,
);
console.log("done");

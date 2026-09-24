import sharp from "sharp";

/**
 * PWA + favicon set from the BuildTags badge logo (public/brand/buildtags-logo.webp).
 * The badge is drawn on white, so every icon keeps a white tile; the maskable
 * icon keeps the artwork inside the 80% safe zone.
 *   pnpm icons
 */
const SRC = "public/brand/buildtags-logo.webp";

async function tile(size, inner, out, { background = "#ffffff" } = {}) {
  const logo = await sharp(SRC).trim().resize(Math.round(size * inner), Math.round(size * inner), { fit: "inside", withoutEnlargement: false }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(out);
}

await tile(192, 0.92, "public/icons/icon-192.png");
await tile(512, 0.92, "public/icons/icon-512.png");
await tile(512, 0.72, "public/icons/icon-maskable-512.png");
await tile(180, 0.9, "public/icons/apple-touch-icon.png");
await tile(32, 0.98, "public/icons/favicon-32.png");
await tile(64, 0.98, "src/app/icon.png");
console.log("icons ok");

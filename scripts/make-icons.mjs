import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icons/icon.svg");
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["icon-maskable-512.png", 512],
]) {
  await sharp(svg, { density: 400 }).resize(size, size).png().toFile(`public/icons/${name}`);
}
await sharp(svg, { density: 400 }).resize(48, 48).png().toFile("src/app/icon.png");
console.log("icons ok");

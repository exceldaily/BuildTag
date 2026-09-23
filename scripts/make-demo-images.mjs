/**
 * Generates the demo vehicle imagery used by supabase/seed/demo_ghost_supra.sql.
 * Stylized SVG renders (no third-party photography) written as WebP under
 * public/demo/<name>/{full,thumb}.webp, mirroring the storage layout.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const scenes = [
  { name: "ghost-1", label: "GHOST", sub: "2022 GR SUPRA", hue: "#e4162b" },
  { name: "ghost-2", label: "612 WHP", sub: "MUSTANG DYNO", hue: "#38bdf8" },
  { name: "ghost-3", label: "TE37", sub: "VOLK RACING", hue: "#f59e0b" },
];

function svg({ label, sub, hue }) {
  const w = 1920;
  const h = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="0.35" cy="0.35" r="0.9"><stop offset="0" stop-color="#2a2a30"/><stop offset="1" stop-color="#050506"/></radialGradient>
    <linearGradient id="floor" x1="0" x2="1"><stop offset="0" stop-color="#0a0a0b"/><stop offset="0.5" stop-color="#26262b"/><stop offset="1" stop-color="#0a0a0b"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <g opacity="0.08" stroke="#ffffff" stroke-width="2">
    ${Array.from({ length: 24 }, (_, i) => `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="${h}"/>`).join("")}
    ${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 80}" x2="${w}" y2="${i * 80}"/>`).join("")}
  </g>
  <rect x="0" y="${h * 0.72}" width="${w}" height="6" fill="url(#floor)"/>
  <!-- car silhouette -->
  <g transform="translate(260 300) scale(2.2)">
    <path d="M70 215 L95 160 Q120 120 175 110 L260 96 Q300 88 340 96 L420 112 Q470 122 520 160 L560 180 Q590 190 590 212 L590 226 Q590 236 578 236 L82 236 Q70 236 70 224 Z" fill="#141416" stroke="#3a3a41" stroke-width="2"/>
    <path d="M190 118 L262 104 Q300 97 336 104 L404 117 L378 152 L212 152 Z" fill="#0b0b0d" stroke="#3a3a41" stroke-width="2"/>
    <path d="M100 196 L560 196" stroke="${hue}" stroke-width="4"/>
    <circle cx="160" cy="228" r="36" fill="#0a0a0b" stroke="#3a3a41" stroke-width="4"/>
    <circle cx="160" cy="228" r="20" fill="#141416" stroke="#8b8b93" stroke-width="2"/>
    <circle cx="470" cy="228" r="36" fill="#0a0a0b" stroke="#3a3a41" stroke-width="4"/>
    <circle cx="470" cy="228" r="20" fill="#141416" stroke="#8b8b93" stroke-width="2"/>
  </g>
  <text x="${w - 120}" y="200" text-anchor="end" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="150" fill="#f2f2f2" opacity="0.9" letter-spacing="8">${label}</text>
  <text x="${w - 124}" y="256" text-anchor="end" font-family="Arial, sans-serif" font-weight="700" font-size="40" fill="${hue}" letter-spacing="14">${sub}</text>
  <text x="120" y="120" font-family="Arial, sans-serif" font-size="28" fill="#8b8b93" letter-spacing="6">BUILDTAG DEMO IMAGE</text>
</svg>`;
}

for (const scene of scenes) {
  const dir = `public/demo/${scene.name}`;
  mkdirSync(dir, { recursive: true });
  const buf = Buffer.from(svg(scene));
  await sharp(buf).webp({ quality: 82 }).toFile(`${dir}/full.webp`);
  await sharp(buf).resize(640).webp({ quality: 76 }).toFile(`${dir}/thumb.webp`);
  console.log("wrote", dir);
}

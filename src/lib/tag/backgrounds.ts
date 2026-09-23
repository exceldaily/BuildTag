import type { BackgroundConfig, BackgroundKind, TagColors } from "./types";

/**
 * Decal backgrounds. Patterns are SVG defs keyed by an id prefix so several
 * previews can share a document. Backgrounds never touch QR contrast: the
 * QR always sits on its own opaque plate.
 */

export const BACKGROUND_OPTIONS: { id: BackgroundKind; name: string; description: string }[] = [
  { id: "solid", name: "Solid", description: "Flat color." },
  { id: "transparent", name: "Transparent", description: "No fill; paint shows through (clear vinyl)." },
  { id: "carbon", name: "Carbon", description: "Subtle woven carbon." },
  { id: "grid", name: "Technical Grid", description: "Blueprint grid lines." },
  { id: "stripe", name: "Race Stripe", description: "Twin racing stripes." },
  { id: "honeycomb", name: "Honeycomb", description: "Hex mesh texture." },
  { id: "brushed", name: "Brushed Metal", description: "Fine horizontal grain." },
  { id: "image", name: "Your Photo", description: "Owner-supplied image, dimmed for legibility." },
];

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function backgroundDefs(idp: string, colors: TagColors, unit: number): string {
  const { accent, foreground, background } = colors;
  const carbonCell = unit * 0.024;
  const gridCell = unit * 0.05;
  const hexR = unit * 0.03;
  const hexW = hexR * Math.sqrt(3);
  const hexH = hexR * 1.5;
  const hexPath = (cx: number, cy: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push(`${(cx + Math.cos(a) * hexR * 0.92).toFixed(2)} ${(cy + Math.sin(a) * hexR * 0.92).toFixed(2)}`);
    }
    return `M${pts.join("L")}Z`;
  };
  return [
    `<pattern id="${idp}-carbon" width="${carbonCell}" height="${carbonCell}" patternUnits="userSpaceOnUse"><rect width="${carbonCell}" height="${carbonCell}" fill="${background}"/><rect width="${carbonCell / 2}" height="${carbonCell / 2}" fill="${foreground}" opacity="0.12"/><rect x="${carbonCell / 2}" y="${carbonCell / 2}" width="${carbonCell / 2}" height="${carbonCell / 2}" fill="${foreground}" opacity="0.12"/><rect y="${carbonCell / 4}" width="${carbonCell / 2}" height="${carbonCell / 4}" fill="${foreground}" opacity="0.06"/></pattern>`,
    `<pattern id="${idp}-grid" width="${gridCell}" height="${gridCell}" patternUnits="userSpaceOnUse"><path d="M ${gridCell} 0 L 0 0 0 ${gridCell}" fill="none" stroke="${accent}" stroke-width="${unit * 0.0015}" opacity="0.4"/></pattern>`,
    `<pattern id="${idp}-honey" width="${hexW}" height="${hexH * 2}" patternUnits="userSpaceOnUse"><path d="${hexPath(hexW / 2, hexR)}" fill="none" stroke="${foreground}" stroke-width="${unit * 0.0015}" opacity="0.25"/><path d="${hexPath(0, hexR + hexH)}" fill="none" stroke="${foreground}" stroke-width="${unit * 0.0015}" opacity="0.25"/><path d="${hexPath(hexW, hexR + hexH)}" fill="none" stroke="${foreground}" stroke-width="${unit * 0.0015}" opacity="0.25"/></pattern>`,
    `<linearGradient id="${idp}-brushed" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${foreground}" stop-opacity="0.16"/><stop offset="0.35" stop-color="${foreground}" stop-opacity="0.02"/><stop offset="0.5" stop-color="${foreground}" stop-opacity="0.2"/><stop offset="0.7" stop-color="${foreground}" stop-opacity="0.04"/><stop offset="1" stop-color="${foreground}" stop-opacity="0.14"/></linearGradient>`,
    `<pattern id="${idp}-grain" width="${unit}" height="${unit * 0.004}" patternUnits="userSpaceOnUse"><rect width="${unit}" height="${unit * 0.002}" fill="${foreground}" opacity="0.05"/></pattern>`,
    `<pattern id="bt-frame-carbon" width="${carbonCell}" height="${carbonCell}" patternUnits="userSpaceOnUse"><rect width="${carbonCell}" height="${carbonCell}" fill="#161616"/><rect width="${carbonCell / 2}" height="${carbonCell / 2}" fill="#2a2a2a"/><rect x="${carbonCell / 2}" y="${carbonCell / 2}" width="${carbonCell / 2}" height="${carbonCell / 2}" fill="#2a2a2a"/></pattern>`,
  ].join("");
}

/**
 * Background fill drawn inside the clip. `w`/`h` are the decal box; when
 * bleeding, the caller extends the box before calling.
 */
export function backgroundSvg(idp: string, bg: BackgroundConfig, colors: TagColors, w: number, h: number, decorOpacity: number): string {
  const base = `<rect x="0" y="0" width="${w}" height="${h}" fill="${colors.background}"/>`;
  switch (bg.kind) {
    case "transparent":
      return "";
    case "carbon":
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-carbon)"/>`;
    case "grid":
      return base + `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-grid)"/>`;
    case "stripe":
      return base + `<rect x="${w * 0.36}" y="0" width="${w * 0.1}" height="${h}" fill="${colors.accent}" opacity="${decorOpacity}"/><rect x="${w * 0.5}" y="0" width="${w * 0.1}" height="${h}" fill="${colors.accent}" opacity="${decorOpacity}"/>`;
    case "honeycomb":
      return base + `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-honey)"/>`;
    case "brushed":
      return base + `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-brushed)"/><rect x="0" y="0" width="${w}" height="${h}" fill="url(#${idp}-grain)"/>`;
    case "image":
      if (!bg.imageUrl) return base;
      return (
        base +
        `<image href="${escapeAttr(bg.imageUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>` +
        `<rect x="0" y="0" width="${w}" height="${h}" fill="${colors.background}" opacity="${Math.min(0.9, Math.max(0, bg.imageDim))}"/>`
      );
    case "solid":
    default:
      return base;
  }
}

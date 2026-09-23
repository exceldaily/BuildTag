import { QR_QUIET_ZONE_MODULES, createQrMatrix, qrModulesPath } from "@/lib/qr/generate";

import { FRAMES } from "./frames";
import { layoutTag, physicalSize } from "./layout";
import { SHAPES } from "./shapes";
import { STYLES } from "./styles";
import type { TagConfig, TagData, TagLayout } from "./types";

export interface RenderOptions {
  /** Draw dashed guides for the cut line and the QR protected area. */
  guides?: boolean;
  /** Include physical width/height attributes (exports). */
  physical?: boolean;
  /** Unique id prefix so several previews can share a document. */
  idPrefix?: string;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decorationSvg(
  kind: (typeof STYLES)[keyof typeof STYLES]["decoration"],
  w: number,
  h: number,
  colors: TagConfig["colors"],
  idp: string,
): string {
  const { accent, foreground } = colors;
  switch (kind) {
    case "stripes":
      return `<rect x="${w * 0.36}" y="0" width="${w * 0.1}" height="${h}" fill="${accent}" opacity="0.9"/><rect x="${w * 0.5}" y="0" width="${w * 0.1}" height="${h}" fill="${accent}" opacity="0.9"/>`;
    case "grid":
      return `<rect width="${w}" height="${h}" fill="url(#${idp}-grid)"/>`;
    case "carbon":
      return `<rect width="${w}" height="${h}" fill="url(#${idp}-carbon)"/>`;
    case "sun": {
      const r = w * 0.55;
      return `<circle cx="${w}" cy="0" r="${r}" fill="${accent}" opacity="0.92"/><rect x="0" y="${h - h * 0.045}" width="${w}" height="${h * 0.045}" fill="${accent}"/>`;
    }
    case "checker": {
      const s = w * 0.05;
      const rows: string[] = [];
      for (let r = 0; r < 2; r++) {
        for (let cIdx = 0; cIdx < Math.ceil(w / s); cIdx++) {
          if ((r + cIdx) % 2 === 0) {
            rows.push(`<rect x="${cIdx * s}" y="${r * s}" width="${s}" height="${s}" fill="${foreground}"/>`);
            rows.push(`<rect x="${cIdx * s}" y="${h - (r + 1) * s}" width="${s}" height="${s}" fill="${foreground}"/>`);
          }
        }
      }
      return rows.join("");
    }
    case "rugged": {
      const parts: string[] = [];
      const m = w * 0.05;
      for (const [x, y] of [
        [m, m],
        [w - m, m],
        [m, h - m],
        [w - m, h - m],
      ]) {
        parts.push(`<circle cx="${x}" cy="${y}" r="${w * 0.02}" fill="${accent}"/><circle cx="${x}" cy="${y}" r="${w * 0.008}" fill="${colors.background}"/>`);
      }
      parts.push(`<rect x="${w * 0.03}" y="${h * 0.03}" width="${w * 0.94}" height="${h - h * 0.06}" fill="none" stroke="${accent}" stroke-width="${w * 0.006}" stroke-dasharray="${w * 0.03} ${w * 0.015}" opacity="0.7"/>`);
      return parts.join("");
    }
    case "bevel":
      return `<rect x="${w * 0.025}" y="${h * 0.025}" width="${w * 0.95}" height="${h * 0.95}" fill="none" stroke="${accent}" stroke-width="${w * 0.004}" opacity="0.55"/>`;
    case "lines":
      return `<rect x="0" y="${h * 0.04}" width="${w}" height="${w * 0.006}" fill="${accent}"/><rect x="0" y="${h - h * 0.04}" width="${w}" height="${w * 0.006}" fill="${accent}"/>`;
    default:
      return "";
  }
}

function defs(idp: string, colors: TagConfig["colors"], w: number, h: number, shapePath: string): string {
  return [
    `<defs>`,
    `<clipPath id="${idp}-clip"><path d="${shapePath}"/></clipPath>`,
    `<pattern id="${idp}-grid" width="${w * 0.05}" height="${w * 0.05}" patternUnits="userSpaceOnUse"><path d="M ${w * 0.05} 0 L 0 0 0 ${w * 0.05}" fill="none" stroke="${colors.accent}" stroke-width="1.5" opacity="0.35"/></pattern>`,
    `<pattern id="${idp}-carbon" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${colors.background}"/><rect width="12" height="12" fill="#2A2A2A"/><rect x="12" y="12" width="12" height="12" fill="#2A2A2A"/><rect width="12" height="12" fill="#3A3A3A" opacity="0.5" transform="translate(0 6)"/><rect x="12" y="12" width="12" height="12" fill="#3A3A3A" opacity="0.5" transform="translate(0 -6)"/></pattern>`,
    `<pattern id="bt-carbon" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#161616"/><rect width="12" height="12" fill="#2A2A2A"/><rect x="12" y="12" width="12" height="12" fill="#2A2A2A"/></pattern>`,
    `</defs>`,
  ].join("");
}

/**
 * Renders the decal as an SVG string. The same function feeds the live
 * preview, the SVG download and the PNG rasterizer, so what the owner sees is
 * what gets printed.
 */
export function renderTagSvg(config: TagConfig, data: TagData, options: RenderOptions = {}): { svg: string; layout: TagLayout } {
  const layout = layoutTag(config, data);
  const shape = SHAPES[config.shape] ?? SHAPES.rounded;
  const style = STYLES[config.style] ?? STYLES.minimal;
  const frame = FRAMES[config.frame] ?? FRAMES.none;
  const idp = options.idPrefix ?? "bt";
  const { width: w, height: h } = layout;
  const colors = config.colors;
  const shapePath = shape.path(w, h);

  const parts: string[] = [];

  const phys = physicalSize(config);
  const sizeAttrs = options.physical
    ? `width="${phys.width.toFixed(3)}${phys.unit}" height="${phys.height.toFixed(3)}${phys.unit}"`
    : `width="100%" height="100%"`;

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" ${sizeAttrs} viewBox="0 0 ${w} ${h}" role="img" aria-label="BuildTag decal preview">`,
  );
  parts.push(defs(idp, colors, w, h, shapePath));

  // Decal body, everything clipped to the outer shape.
  parts.push(`<g clip-path="url(#${idp}-clip)">`);
  parts.push(`<path d="${shapePath}" fill="${colors.background}"/>`);
  parts.push(decorationSvg(style.decoration, w, h, colors, idp));
  if (shape.decoration) parts.push(shape.decoration(w, h, colors.accent, colors.foreground));

  // QR frame + protected QR block.
  if (layout.qr) {
    const q = layout.qr;
    if (frame.id !== "none") {
      parts.push(frame.render(q.frameX, q.frameY, q.frameSize, { fg: colors.foreground, accent: colors.accent, bg: colors.background }));
    }
    const matrix = createQrMatrix(data.scanUrl);
    const path = qrModulesPath(matrix);
    const scale = q.size / q.totalModules;
    // The light plate IS the quiet zone: always opaque, always full contrast.
    parts.push(`<rect x="${q.x}" y="${q.y}" width="${q.size}" height="${q.size}" fill="${colors.qrLight}"/>`);
    parts.push(
      `<path transform="translate(${q.x + QR_QUIET_ZONE_MODULES * scale} ${q.y + QR_QUIET_ZONE_MODULES * scale}) scale(${scale})" d="${path}" fill="${colors.qrDark}" shape-rendering="crispEdges"/>`,
    );
  }

  // Text lines.
  for (const line of layout.lines) {
    parts.push(
      `<text x="${line.x.toFixed(1)}" y="${line.y.toFixed(1)}" font-family="${escapeXml(line.fontFamily)}" font-size="${line.fontSize.toFixed(1)}" font-weight="${line.weight}" letter-spacing="${line.letterSpacing.toFixed(2)}" text-anchor="${line.anchor}" fill="${line.color}">${escapeXml(line.text)}</text>`,
    );
  }

  parts.push(`</g>`);

  // Border on top of everything, inside the cut line.
  if (style.border > 0) {
    parts.push(`<path d="${shapePath}" fill="none" stroke="${style.borderColor ?? colors.foreground}" stroke-width="${style.border * 2}" clip-path="url(#${idp}-clip)"/>`);
  }

  if (options.guides) {
    parts.push(`<path d="${shapePath}" fill="none" stroke="#22D3EE" stroke-width="3" stroke-dasharray="14 10" opacity="0.9"/>`);
    if (layout.qr) {
      const q = layout.qr;
      parts.push(`<rect x="${q.x}" y="${q.y}" width="${q.size}" height="${q.size}" fill="none" stroke="#F59E0B" stroke-width="3" stroke-dasharray="10 8"/>`);
    }
  }

  parts.push(`</svg>`);
  return { svg: parts.join(""), layout };
}

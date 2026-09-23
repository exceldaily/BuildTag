import type { FrameId } from "./types";

/**
 * Decorative frames AROUND the protected QR block. Each frame is drawn inside
 * a square of size S; the QR block (including its quiet zone) is a centered
 * square of side S * inner. Nothing a frame draws enters that inner square,
 * so finder, timing and alignment patterns and the quiet zone stay clean.
 */

export interface FrameColors {
  fg: string;
  accent: string;
  bg: string;
}

export interface FrameDefinition {
  id: FrameId;
  name: string;
  description: string;
  /** QR block size as a fraction of the frame square. */
  inner: number;
  render: (x: number, y: number, size: number, colors: FrameColors) => string;
}

const ring = (cx: number, cy: number, r: number, stroke: string, width: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;

export const FRAMES: Record<FrameId, FrameDefinition> = {
  none: { id: "none", name: "None", description: "No frame; the QR sits on its plate.", inner: 1, render: () => "" },

  tire: {
    id: "tire",
    name: "Tire",
    description: "Tread-block ring.",
    inner: 0.56,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.fg}"/>`];
      for (let i = 0; i < 24; i++) {
        parts.push(`<rect x="${cx - s * 0.022}" y="${cy - r + s * 0.012}" width="${s * 0.044}" height="${s * 0.075}" rx="${s * 0.01}" fill="${c.bg}" transform="rotate(${(360 * i) / 24} ${cx} ${cy})"/>`);
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.8}" fill="${c.bg}"/>`);
      parts.push(ring(cx, cy, r * 0.8, c.accent, s * 0.012));
      return parts.join("");
    },
  },

  wheel: {
    id: "wheel",
    name: "Wheel",
    description: "Five-spoke rim.",
    inner: 0.5,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [ring(cx, cy, r * 0.94, c.fg, s * 0.09), ring(cx, cy, r * 0.85, c.accent, s * 0.008)];
      for (let i = 0; i < 5; i++) {
        const deg = (360 * i) / 5;
        parts.push(`<path d="M${cx - s * 0.045} ${cy - r * 0.4}L${cx - s * 0.06} ${cy - r * 0.9}L${cx + s * 0.06} ${cy - r * 0.9}L${cx + s * 0.045} ${cy - r * 0.4}Z" fill="${c.fg}" transform="rotate(${deg} ${cx} ${cy})"/>`);
        const la = ((deg + 36) * Math.PI) / 180 - Math.PI / 2;
        parts.push(`<circle cx="${cx + Math.cos(la) * r * 0.44}" cy="${cy + Math.sin(la) * r * 0.44}" r="${s * 0.018}" fill="${c.accent}"/>`);
      }
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.41}" fill="${c.fg}"/>`);
      return parts.join("");
    },
  },

  turbo: {
    id: "turbo",
    name: "Turbo",
    description: "Compressor housing with outlet.",
    inner: 0.42,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [];
      parts.push(`<path d="M${cx} ${cy - r * 0.96}A${r * 0.96} ${r * 0.96} 0 1 1 ${cx - r * 0.96} ${cy}L${cx - r * 0.96} ${cy + r * 0.55}Q${cx - r * 0.96} ${cy + r * 0.9} ${cx - r * 0.6} ${cy + r * 0.9}L${cx - r * 0.1} ${cy + r * 0.9}A${r * 0.62} ${r * 0.62} 0 1 0 ${cx} ${cy - r * 0.62}Z" fill="${c.fg}"/>`);
      parts.push(`<rect x="${cx - r * 0.98}" y="${cy + r * 0.45}" width="${r * 0.5}" height="${r * 0.5}" rx="${r * 0.05}" fill="${c.fg}"/>`);
      parts.push(`<rect x="${cx - r * 0.92}" y="${cy + r * 0.52}" width="${r * 0.38}" height="${r * 0.36}" rx="${r * 0.04}" fill="none" stroke="${c.accent}" stroke-width="${s * 0.008}"/>`);
      for (let i = 0; i < 11; i++) {
        parts.push(`<path d="M${cx} ${cy - r * 0.36}Q${cx + r * 0.16} ${cy - r * 0.5} ${cx + r * 0.05} ${cy - r * 0.6}" stroke="${c.accent}" stroke-width="${s * 0.012}" fill="none" stroke-linecap="round" transform="rotate(${(360 * i) / 11} ${cx} ${cy})"/>`);
      }
      parts.push(ring(cx, cy, r * 0.62, c.accent, s * 0.006));
      return parts.join("");
    },
  },

  tachometer: {
    id: "tachometer",
    name: "Tachometer",
    description: "RPM sweep with redline.",
    inner: 0.6,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.fg}"/>`, `<circle cx="${cx}" cy="${cy}" r="${r * 0.92}" fill="${c.bg}"/>`];
      for (let i = 0; i < 32; i++) {
        const a = (Math.PI * 2 * i) / 32 - Math.PI / 2;
        const major = i % 4 === 0;
        const inner = r * (major ? 0.72 : 0.78);
        const outer = r * 0.88;
        parts.push(`<line x1="${cx + Math.cos(a) * inner}" y1="${cy + Math.sin(a) * inner}" x2="${cx + Math.cos(a) * outer}" y2="${cy + Math.sin(a) * outer}" stroke="${major ? c.fg : c.accent}" stroke-width="${s * (major ? 0.014 : 0.007)}" stroke-linecap="round"/>`);
      }
      const start = -Math.PI / 2 + Math.PI * 0.2;
      const end = -Math.PI / 2 + Math.PI * 0.55;
      const rr = r * 0.83;
      parts.push(`<path d="M${cx + Math.cos(start) * rr} ${cy + Math.sin(start) * rr}A${rr} ${rr} 0 0 1 ${cx + Math.cos(end) * rr} ${cy + Math.sin(end) * rr}" stroke="${c.accent}" stroke-width="${s * 0.03}" fill="none"/>`);
      return parts.join("");
    },
  },

  piston: {
    id: "piston",
    name: "Piston",
    description: "Crown, rings and skirt.",
    inner: 0.58,
    render: (x, y, s, c) => {
      const parts: string[] = [];
      const crownH = s * 0.16;
      parts.push(`<rect x="${x + s * 0.06}" y="${y}" width="${s * 0.88}" height="${crownH}" rx="${s * 0.02}" fill="${c.fg}"/>`);
      for (let i = 0; i < 3; i++) parts.push(`<rect x="${x + s * 0.06}" y="${y + crownH * (0.25 + i * 0.25)}" width="${s * 0.88}" height="${s * 0.012}" fill="${c.accent}"/>`);
      parts.push(`<rect x="${x + s * 0.06}" y="${y + crownH}" width="${s * 0.12}" height="${s * 0.84}" fill="${c.fg}"/>`);
      parts.push(`<rect x="${x + s * 0.82}" y="${y + crownH}" width="${s * 0.12}" height="${s * 0.84}" fill="${c.fg}"/>`);
      parts.push(`<circle cx="${x + s * 0.12}" cy="${y + s * 0.6}" r="${s * 0.045}" fill="${c.bg}" stroke="${c.accent}" stroke-width="${s * 0.01}"/>`);
      parts.push(`<circle cx="${x + s * 0.88}" cy="${y + s * 0.6}" r="${s * 0.045}" fill="${c.bg}" stroke="${c.accent}" stroke-width="${s * 0.01}"/>`);
      parts.push(`<rect x="${x + s * 0.06}" y="${y + s * 0.94}" width="${s * 0.88}" height="${s * 0.06}" fill="${c.fg}"/>`);
      return parts.join("");
    },
  },

  hex: {
    id: "hex",
    name: "Hex",
    description: "Bolt-head surround.",
    inner: 0.5,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const hexPath = (r: number) => {
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          pts.push(`${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`);
        }
        return `M${pts.join("L")}Z`;
      };
      return [`<path d="${hexPath(s / 2)}" fill="${c.fg}"/>`, `<path d="${hexPath(s * 0.44)}" fill="${c.bg}"/>`, `<path d="${hexPath(s * 0.405)}" fill="none" stroke="${c.accent}" stroke-width="${s * 0.008}"/>`].join("");
    },
  },

  raceplate: {
    id: "raceplate",
    name: "Race Plate",
    description: "Number board with a header stripe.",
    inner: 0.62,
    render: (x, y, s, c) => {
      const parts: string[] = [];
      parts.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.03}" fill="${c.fg}"/>`);
      parts.push(`<rect x="${x + s * 0.04}" y="${y + s * 0.15}" width="${s * 0.92}" height="${s * 0.81}" rx="${s * 0.02}" fill="${c.bg}"/>`);
      parts.push(`<rect x="${x}" y="${y}" width="${s}" height="${s * 0.11}" rx="${s * 0.03}" fill="${c.accent}"/>`);
      for (let i = 0; i < 6; i++) parts.push(`<rect x="${x + s * 0.06 + i * s * 0.15}" y="${y + s * 0.02}" width="${s * 0.07}" height="${s * 0.07}" fill="${c.fg}" opacity="${i % 2 ? 0.9 : 0.35}"/>`);
      return parts.join("");
    },
  },

  plate: {
    id: "plate",
    name: "License Plate",
    description: "Miniature plate with bolts.",
    inner: 0.66,
    render: (x, y, s, c) => {
      const parts: string[] = [];
      parts.push(`<rect x="${x}" y="${y + s * 0.02}" width="${s}" height="${s * 0.96}" rx="${s * 0.06}" fill="${c.fg}"/>`);
      parts.push(`<rect x="${x + s * 0.05}" y="${y + s * 0.07}" width="${s * 0.9}" height="${s * 0.86}" rx="${s * 0.04}" fill="${c.bg}"/>`);
      for (const [hx, hy] of [
        [x + s * 0.1, y + s * 0.12],
        [x + s * 0.9, y + s * 0.12],
        [x + s * 0.1, y + s * 0.88],
        [x + s * 0.9, y + s * 0.88],
      ]) {
        parts.push(`<circle cx="${hx}" cy="${hy}" r="${s * 0.02}" fill="${c.accent}"/>`);
      }
      return parts.join("");
    },
  },

  carbon: {
    id: "carbon",
    name: "Carbon Badge",
    description: "Woven carbon border.",
    inner: 0.72,
    render: (x, y, s, c) =>
      [
        `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.08}" fill="url(#bt-frame-carbon)"/>`,
        `<rect x="${x + s * 0.02}" y="${y + s * 0.02}" width="${s * 0.96}" height="${s * 0.96}" rx="${s * 0.07}" fill="none" stroke="${c.accent}" stroke-width="${s * 0.01}"/>`,
        `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.08}" fill="none" stroke="${c.fg}" stroke-width="${s * 0.012}" opacity="0.6"/>`,
      ].join(""),
  },

  engineering: {
    id: "engineering",
    name: "Engineering",
    description: "Blueprint corner marks and dimension ticks.",
    inner: 0.72,
    render: (x, y, s, c) => {
      const parts: string[] = [];
      const m = s * 0.06;
      const L = s * 0.16;
      const sw = s * 0.012;
      const corners: [number, number, number, number][] = [
        [x, y, 1, 1],
        [x + s, y, -1, 1],
        [x, y + s, 1, -1],
        [x + s, y + s, -1, -1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        parts.push(`<path d="M${cx + dx * m} ${cy + dy * (m + L)}V${cy + dy * m}H${cx + dx * (m + L)}" fill="none" stroke="${c.accent}" stroke-width="${sw}"/>`);
      }
      for (let i = 1; i < 10; i++) {
        const t = x + (s * i) / 10;
        parts.push(`<line x1="${t}" y1="${y + s * 0.02}" x2="${t}" y2="${y + s * (i % 5 === 0 ? 0.06 : 0.045)}" stroke="${c.fg}" stroke-width="${sw * 0.7}" opacity="0.7"/>`);
        const tl = y + (s * i) / 10;
        parts.push(`<line x1="${x + s * 0.02}" y1="${tl}" x2="${x + s * (i % 5 === 0 ? 0.06 : 0.045)}" y2="${tl}" stroke="${c.fg}" stroke-width="${sw * 0.7}" opacity="0.7"/>`);
      }
      parts.push(`<rect x="${x + s * 0.11}" y="${y + s * 0.11}" width="${s * 0.78}" height="${s * 0.78}" fill="none" stroke="${c.fg}" stroke-width="${sw * 0.6}" stroke-dasharray="${s * 0.03} ${s * 0.015}" opacity="0.6"/>`);
      parts.push(`<circle cx="${x + s * 0.5}" cy="${y + s * 0.05}" r="${s * 0.012}" fill="${c.accent}"/>`);
      parts.push(`<circle cx="${x + s * 0.05}" cy="${y + s * 0.5}" r="${s * 0.012}" fill="${c.accent}"/>`);
      return parts.join("");
    },
  },
};

export const FRAME_LIST = Object.values(FRAMES);

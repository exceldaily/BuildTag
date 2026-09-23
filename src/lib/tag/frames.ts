import type { FrameId } from "./types";

/**
 * Decorative frames around the QR. Each frame is drawn inside a square of
 * size S; the QR block (including its quiet zone) is a centered square of size
 * S * inner. Everything a frame draws stays OUTSIDE that inner square, so no
 * decoration can touch finder, timing or alignment patterns or the quiet zone.
 */

export interface FrameDefinition {
  id: FrameId;
  name: string;
  /** QR block size as a fraction of the frame square. */
  inner: number;
  render: (x: number, y: number, size: number, colors: { fg: string; accent: string; bg: string }) => string;
  pro: boolean;
}

const ring = (cx: number, cy: number, r: number, stroke: string, width: number, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;

export const FRAMES: Record<FrameId, FrameDefinition> = {
  none: { id: "none", name: "None", inner: 1, render: () => "", pro: false },

  tire: {
    id: "tire",
    name: "Tire",
    inner: 0.56,
    pro: true,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [];
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.fg}"/>`);
      for (let i = 0; i < 24; i++) {
        const deg = (360 * i) / 24;
        parts.push(
          `<rect x="${cx - s * 0.022}" y="${cy - r + s * 0.012}" width="${s * 0.044}" height="${s * 0.075}" rx="${s * 0.01}" fill="${c.bg}" transform="rotate(${deg} ${cx} ${cy})"/>`,
        );
      }
      // inner rim disc that carries the QR plate, then a thin accent ring
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.8}" fill="${c.bg}"/>`);
      parts.push(ring(cx, cy, r * 0.8, c.accent, s * 0.012));
      return parts.join("");
    },
  },

  wheel: {
    id: "wheel",
    name: "Wheel",
    inner: 0.5,
    pro: true,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [];
      parts.push(ring(cx, cy, r * 0.94, c.fg, s * 0.09));
      parts.push(ring(cx, cy, r * 0.85, c.accent, s * 0.008));
      for (let i = 0; i < 5; i++) {
        const deg = (360 * i) / 5;
        parts.push(
          `<path d="M${cx - s * 0.045} ${cy - r * 0.4}L${cx - s * 0.06} ${cy - r * 0.9}L${cx + s * 0.06} ${cy - r * 0.9}L${cx + s * 0.045} ${cy - r * 0.4}Z" fill="${c.fg}" transform="rotate(${deg} ${cx} ${cy})"/>`,
        );
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
    inner: 0.42,
    pro: true,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [];
      // volute (scroll) housing
      parts.push(
        `<path d="M${cx} ${cy - r * 0.96}A${r * 0.96} ${r * 0.96} 0 1 1 ${cx - r * 0.96} ${cy}L${cx - r * 0.96} ${cy + r * 0.55}Q${cx - r * 0.96} ${cy + r * 0.9} ${cx - r * 0.6} ${cy + r * 0.9}L${cx - r * 0.1} ${cy + r * 0.9}A${r * 0.62} ${r * 0.62} 0 1 0 ${cx} ${cy - r * 0.62}Z" fill="${c.fg}"/>`,
      );
      // outlet flange
      parts.push(`<rect x="${cx - r * 0.98}" y="${cy + r * 0.45}" width="${r * 0.5}" height="${r * 0.5}" rx="${r * 0.05}" fill="${c.fg}"/>`);
      parts.push(`<rect x="${cx - r * 0.92}" y="${cy + r * 0.52}" width="${r * 0.38}" height="${r * 0.36}" rx="${r * 0.04}" fill="none" stroke="${c.accent}" stroke-width="${s * 0.008}"/>`);
      // compressor wheel blades between housing and QR plate
      for (let i = 0; i < 11; i++) {
        const deg = (360 * i) / 11;
        parts.push(
          `<path d="M${cx} ${cy - r * 0.36}Q${cx + r * 0.16} ${cy - r * 0.5} ${cx + r * 0.05} ${cy - r * 0.6}" stroke="${c.accent}" stroke-width="${s * 0.012}" fill="none" stroke-linecap="round" transform="rotate(${deg} ${cx} ${cy})"/>`,
        );
      }
      parts.push(ring(cx, cy, r * 0.62, c.accent, s * 0.006));
      return parts.join("");
    },
  },

  gauge: {
    id: "gauge",
    name: "Gauge",
    inner: 0.6,
    pro: true,
    render: (x, y, s, c) => {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s / 2;
      const parts: string[] = [];
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.fg}"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.92}" fill="${c.bg}"/>`);
      for (let i = 0; i < 32; i++) {
        const a = (Math.PI * 2 * i) / 32 - Math.PI / 2;
        const major = i % 4 === 0;
        const inner = r * (major ? 0.72 : 0.78);
        const outer = r * 0.88;
        parts.push(
          `<line x1="${cx + Math.cos(a) * inner}" y1="${cy + Math.sin(a) * inner}" x2="${cx + Math.cos(a) * outer}" y2="${cy + Math.sin(a) * outer}" stroke="${major ? c.fg : c.accent}" stroke-width="${s * (major ? 0.014 : 0.007)}" stroke-linecap="round"/>`,
        );
      }
      const start = -Math.PI / 2 + Math.PI * 0.2;
      const end = -Math.PI / 2 + Math.PI * 0.55;
      const rr = r * 0.83;
      parts.push(
        `<path d="M${cx + Math.cos(start) * rr} ${cy + Math.sin(start) * rr}A${rr} ${rr} 0 0 1 ${cx + Math.cos(end) * rr} ${cy + Math.sin(end) * rr}" stroke="${c.accent}" stroke-width="${s * 0.03}" fill="none"/>`,
      );
      return parts.join("");
    },
  },

  piston: {
    id: "piston",
    name: "Piston",
    inner: 0.58,
    pro: true,
    render: (x, y, s, c) => {
      const parts: string[] = [];
      const crownH = s * 0.16;
      // crown
      parts.push(`<rect x="${x + s * 0.06}" y="${y}" width="${s * 0.88}" height="${crownH}" rx="${s * 0.02}" fill="${c.fg}"/>`);
      for (let i = 0; i < 3; i++) {
        parts.push(`<rect x="${x + s * 0.06}" y="${y + crownH * (0.25 + i * 0.25)}" width="${s * 0.88}" height="${s * 0.012}" fill="${c.accent}"/>`);
      }
      // skirt sides
      parts.push(`<rect x="${x + s * 0.06}" y="${y + crownH}" width="${s * 0.12}" height="${s * 0.84}" fill="${c.fg}"/>`);
      parts.push(`<rect x="${x + s * 0.82}" y="${y + crownH}" width="${s * 0.12}" height="${s * 0.84}" fill="${c.fg}"/>`);
      // wrist pin bosses
      parts.push(`<circle cx="${x + s * 0.12}" cy="${y + s * 0.6}" r="${s * 0.045}" fill="${c.bg}" stroke="${c.accent}" stroke-width="${s * 0.01}"/>`);
      parts.push(`<circle cx="${x + s * 0.88}" cy="${y + s * 0.6}" r="${s * 0.045}" fill="${c.bg}" stroke="${c.accent}" stroke-width="${s * 0.01}"/>`);
      // bottom bar
      parts.push(`<rect x="${x + s * 0.06}" y="${y + s * 0.94}" width="${s * 0.88}" height="${s * 0.06}" fill="${c.fg}"/>`);
      return parts.join("");
    },
  },

  hex: {
    id: "hex",
    name: "Hex",
    inner: 0.5,
    pro: false,
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
      return [
        `<path d="${hexPath(s / 2)}" fill="${c.fg}"/>`,
        `<path d="${hexPath(s * 0.44)}" fill="${c.bg}"/>`,
        `<path d="${hexPath(s * 0.405)}" fill="none" stroke="${c.accent}" stroke-width="${s * 0.008}"/>`,
      ].join("");
    },
  },

  plate: {
    id: "plate",
    name: "License Plate",
    inner: 0.66,
    pro: false,
    render: (x, y, s, c) => {
      const parts: string[] = [];
      parts.push(`<rect x="${x}" y="${y + s * 0.02}" width="${s}" height="${s * 0.96}" rx="${s * 0.06}" fill="${c.fg}"/>`);
      parts.push(`<rect x="${x + s * 0.05}" y="${y + s * 0.07}" width="${s * 0.9}" height="${s * 0.86}" rx="${s * 0.04}" fill="${c.bg}"/>`);
      const holes: [number, number][] = [
        [x + s * 0.1, y + s * 0.12],
        [x + s * 0.9, y + s * 0.12],
        [x + s * 0.1, y + s * 0.88],
        [x + s * 0.9, y + s * 0.88],
      ];
      for (const [hx, hy] of holes) parts.push(`<circle cx="${hx}" cy="${hy}" r="${s * 0.02}" fill="${c.accent}"/>`);
      return parts.join("");
    },
  },

  carbon: {
    id: "carbon",
    name: "Carbon Badge",
    inner: 0.72,
    pro: true,
    render: (x, y, s, c) => {
      return [
        `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.08}" fill="url(#bt-carbon)"/>`,
        `<rect x="${x + s * 0.02}" y="${y + s * 0.02}" width="${s * 0.96}" height="${s * 0.96}" rx="${s * 0.07}" fill="none" stroke="${c.accent}" stroke-width="${s * 0.01}"/>`,
        `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.08}" fill="none" stroke="${c.fg}" stroke-width="${s * 0.012}" opacity="0.6"/>`,
      ].join("");
    },
  },
};

export const FRAME_LIST = Object.values(FRAMES);

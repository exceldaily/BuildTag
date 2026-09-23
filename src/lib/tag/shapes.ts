import type { ShapeId } from "./types";

/**
 * Outer decal shapes. Every shape is defined in a 1000-unit-wide box; the
 * height is width * aspect. `contentRect` is the area the layout engine may
 * place the QR block and text in, so nothing ever crosses the cut line.
 */

export interface ShapeDefinition {
  id: ShapeId;
  name: string;
  /** height / width */
  aspect: number;
  /** Outline path for a w x h box (used for clipping and the cut-line stroke). */
  path: (w: number, h: number) => string;
  contentRect: (w: number, h: number) => { x: number; y: number; w: number; h: number };
  /** Extra decoration that belongs to the shape itself (bolt holes, bezel). */
  decoration?: (w: number, h: number, accent: string, fg: string) => string;
  landscape: boolean;
  pro: boolean;
}

const rect = (w: number, h: number, r = 0) =>
  r > 0
    ? `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`
    : `M0 0H${w}V${h}H0Z`;

const circle = (w: number, h: number) => {
  const r = Math.min(w, h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
};

const hexagon = (w: number, h: number) => {
  // pointy-top hexagon
  const cx = w / 2;
  const pts = [
    [cx, 0],
    [w, h * 0.25],
    [w, h * 0.75],
    [cx, h],
    [0, h * 0.75],
    [0, h * 0.25],
  ];
  return `M${pts.map((p) => p.join(" ")).join("L")}Z`;
};

const shield = (w: number, h: number) => {
  const r = 70;
  return [
    `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}`,
    `V${h * 0.58}`,
    `C${w} ${h * 0.82} ${w * 0.75} ${h * 0.93} ${w / 2} ${h}`,
    `C${w * 0.25} ${h * 0.93} 0 ${h * 0.82} 0 ${h * 0.58}`,
    `V${r}A${r} ${r} 0 0 1 ${r} 0Z`,
  ].join("");
};

const badge = (w: number, h: number) => {
  const c = Math.min(w, h) * 0.12;
  return `M${c} 0H${w - c}L${w} ${c}V${h - c}L${w - c} ${h}H${c}L0 ${h - c}V${c}Z`;
};

const boltHoles = (points: [number, number][], r: number, color: string) =>
  points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.9"/>`).join("");

export const SHAPES: Record<ShapeId, ShapeDefinition> = {
  rectangle: {
    id: "rectangle",
    name: "Rectangle",
    aspect: 1.3,
    path: (w, h) => rect(w, h, 0),
    contentRect: (w, h) => ({ x: w * 0.08, y: h * 0.07, w: w * 0.84, h: h * 0.86 }),
    landscape: false,
    pro: false,
  },
  rounded: {
    id: "rounded",
    name: "Rounded",
    aspect: 1.3,
    path: (w, h) => rect(w, h, 70),
    contentRect: (w, h) => ({ x: w * 0.08, y: h * 0.07, w: w * 0.84, h: h * 0.86 }),
    landscape: false,
    pro: false,
  },
  square: {
    id: "square",
    name: "Square",
    aspect: 1,
    path: (w, h) => rect(w, h, 40),
    contentRect: (w, h) => ({ x: w * 0.08, y: h * 0.08, w: w * 0.84, h: h * 0.84 }),
    landscape: false,
    pro: false,
  },
  circle: {
    id: "circle",
    name: "Circle",
    aspect: 1,
    path: circle,
    contentRect: (w, h) => ({ x: w * 0.17, y: h * 0.15, w: w * 0.66, h: h * 0.7 }),
    landscape: false,
    pro: false,
  },
  hex: {
    id: "hex",
    name: "Hex",
    aspect: 1.12,
    path: hexagon,
    contentRect: (w, h) => ({ x: w * 0.13, y: h * 0.17, w: w * 0.74, h: h * 0.66 }),
    landscape: false,
    pro: true,
  },
  shield: {
    id: "shield",
    name: "Shield",
    aspect: 1.2,
    path: shield,
    contentRect: (w, h) => ({ x: w * 0.1, y: h * 0.07, w: w * 0.8, h: h * 0.72 }),
    landscape: false,
    pro: true,
  },
  plate: {
    id: "plate",
    name: "License Plate",
    aspect: 0.5,
    path: (w, h) => rect(w, h, 50),
    contentRect: (w, h) => ({ x: w * 0.07, y: h * 0.16, w: w * 0.86, h: h * 0.7 }),
    decoration: (w, h, accent) =>
      boltHoles(
        [
          [w * 0.045, h * 0.1],
          [w * 0.955, h * 0.1],
          [w * 0.045, h * 0.9],
          [w * 0.955, h * 0.9],
        ],
        h * 0.035,
        accent,
      ),
    landscape: true,
    pro: false,
  },
  gauge: {
    id: "gauge",
    name: "Gauge",
    aspect: 1,
    path: circle,
    contentRect: (w, h) => ({ x: w * 0.2, y: h * 0.19, w: w * 0.6, h: h * 0.62 }),
    decoration: (w, h, accent, fg) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = w / 2;
      const ticks: string[] = [];
      for (let i = 0; i < 36; i++) {
        const a = (Math.PI * 2 * i) / 36 - Math.PI / 2;
        const major = i % 3 === 0;
        const inner = r * (major ? 0.86 : 0.9);
        const outer = r * 0.95;
        ticks.push(
          `<line x1="${cx + Math.cos(a) * inner}" y1="${cy + Math.sin(a) * inner}" x2="${cx + Math.cos(a) * outer}" y2="${cy + Math.sin(a) * outer}" stroke="${major ? fg : accent}" stroke-width="${major ? 9 : 4}" stroke-linecap="round"/>`,
        );
      }
      // redline arc, top-right quadrant
      const start = -Math.PI / 2 + Math.PI * 0.15;
      const end = -Math.PI / 2 + Math.PI * 0.5;
      const rr = r * 0.905;
      ticks.push(
        `<path d="M${cx + Math.cos(start) * rr} ${cy + Math.sin(start) * rr}A${rr} ${rr} 0 0 1 ${cx + Math.cos(end) * rr} ${cy + Math.sin(end) * rr}" stroke="${accent}" stroke-width="16" fill="none"/>`,
      );
      ticks.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.985}" fill="none" stroke="${fg}" stroke-width="10"/>`);
      return ticks.join("");
    },
    landscape: false,
    pro: true,
  },
  tire: {
    id: "tire",
    name: "Tire",
    aspect: 1,
    path: circle,
    contentRect: (w, h) => ({ x: w * 0.22, y: h * 0.21, w: w * 0.56, h: h * 0.58 }),
    decoration: (w, h, accent, fg) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = w / 2;
      const blocks: string[] = [];
      for (let i = 0; i < 28; i++) {
        const a = (Math.PI * 2 * i) / 28;
        const deg = (a * 180) / Math.PI;
        blocks.push(
          `<rect x="${cx - 14}" y="${cy - r + 8}" width="28" height="${r * 0.11}" rx="5" fill="${accent}" transform="rotate(${deg} ${cx} ${cy})"/>`,
        );
      }
      blocks.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="none" stroke="${fg}" stroke-width="8" opacity="0.7"/>`);
      blocks.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.985}" fill="none" stroke="${fg}" stroke-width="6" opacity="0.5"/>`);
      return blocks.join("");
    },
    landscape: false,
    pro: true,
  },
  badge: {
    id: "badge",
    name: "Performance Badge",
    aspect: 0.62,
    path: badge,
    contentRect: (w, h) => ({ x: w * 0.06, y: h * 0.14, w: w * 0.88, h: h * 0.74 }),
    landscape: true,
    pro: false,
  },
};

export const SHAPE_LIST = Object.values(SHAPES);

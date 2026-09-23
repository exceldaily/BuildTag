import type { ShapeId } from "./types";

/**
 * Outer decal shapes. Each shape is drawn into the w x h box that the
 * physical size dictates. Circular shapes use the largest centered square.
 * `contentRect` is the area the layout engine may place the QR block and
 * text in, so nothing ever crosses the cut line.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShapeDefinition {
  id: ShapeId;
  name: string;
  description: string;
  /** Outline path for the box (used for clipping and the cut line). */
  path: (w: number, h: number) => string;
  contentRect: (w: number, h: number) => Rect;
  /** Decoration that belongs to the shape itself (bolt holes, bezel, tread). */
  decoration?: (w: number, h: number, accent: string, fg: string, opacity: number) => string;
  /** True when the shape is built in the largest centered square. */
  square: boolean;
  /** Layouts that suit this shape best (UI hint only). */
  landscapeFriendly: boolean;
}

const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`;
};

function squareBox(w: number, h: number): Rect {
  const s = Math.min(w, h);
  return { x: (w - s) / 2, y: (h - s) / 2, w: s, h: s };
}

const circlePath = (w: number, h: number) => {
  const b = squareBox(w, h);
  const r = b.w / 2;
  const cx = b.x + r;
  const cy = b.y + r;
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
};

const hexPath = (w: number, h: number) => {
  const b = squareBox(w, h);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const r = b.w / 2;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`);
  }
  return `M${pts.join("L")}Z`;
};

const shieldPath = (w: number, h: number) => {
  const r = Math.min(w, h) * 0.08;
  return [
    `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}`,
    `V${h * 0.6}`,
    `C${w} ${h * 0.84} ${w * 0.75} ${h * 0.94} ${w / 2} ${h}`,
    `C${w * 0.25} ${h * 0.94} 0 ${h * 0.84} 0 ${h * 0.6}`,
    `V${r}A${r} ${r} 0 0 1 ${r} 0Z`,
  ].join("");
};

const badgePath = (w: number, h: number) => {
  const c = Math.min(w, h) * 0.12;
  return `M${c} 0H${w - c}L${w} ${c}V${h - c}L${w - c} ${h}H${c}L0 ${h - c}V${c}Z`;
};

const racePlatePath = (w: number, h: number) => {
  const c = Math.min(w, h) * 0.07;
  return `M0 ${c}L${c} 0H${w - c}L${w} ${c}V${h}H0Z`;
};

const widePath = (w: number, h: number) => roundedRect(0, 0, w, h, h / 2);

const boltHoles = (points: [number, number][], r: number, color: string) =>
  points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.9"/>`).join("");

export const SHAPES: Record<ShapeId, ShapeDefinition> = {
  rectangle: {
    id: "rectangle",
    name: "Rectangle",
    description: "Straight edges, maximum print area.",
    path: (w, h) => `M0 0H${w}V${h}H0Z`,
    contentRect: (w, h) => ({ x: w * 0.07, y: h * 0.07, w: w * 0.86, h: h * 0.86 }),
    square: false,
    landscapeFriendly: true,
  },
  rounded: {
    id: "rounded",
    name: "Rounded",
    description: "Softened corners, the default sticker.",
    path: (w, h) => roundedRect(0, 0, w, h, Math.min(w, h) * 0.08),
    contentRect: (w, h) => ({ x: w * 0.07, y: h * 0.07, w: w * 0.86, h: h * 0.86 }),
    square: false,
    landscapeFriendly: true,
  },
  square: {
    id: "square",
    name: "Square",
    description: "Equal sides inside the chosen size.",
    path: (w, h) => {
      const b = squareBox(w, h);
      return roundedRect(b.x, b.y, b.w, b.h, b.w * 0.05);
    },
    contentRect: (w, h) => {
      const b = squareBox(w, h);
      return { x: b.x + b.w * 0.08, y: b.y + b.h * 0.08, w: b.w * 0.84, h: b.h * 0.84 };
    },
    square: true,
    landscapeFriendly: false,
  },
  circle: {
    id: "circle",
    name: "Circle",
    description: "Round badge.",
    path: circlePath,
    contentRect: (w, h) => {
      const b = squareBox(w, h);
      return { x: b.x + b.w * 0.16, y: b.y + b.h * 0.15, w: b.w * 0.68, h: b.h * 0.7 };
    },
    square: true,
    landscapeFriendly: false,
  },
  hex: {
    id: "hex",
    name: "Hexagon",
    description: "Motorsport hex badge.",
    path: hexPath,
    contentRect: (w, h) => {
      const b = squareBox(w, h);
      return { x: b.x + b.w * 0.16, y: b.y + b.h * 0.17, w: b.w * 0.68, h: b.h * 0.66 };
    },
    square: true,
    landscapeFriendly: false,
  },
  shield: {
    id: "shield",
    name: "Shield",
    description: "Crest silhouette, tapered bottom.",
    path: shieldPath,
    contentRect: (w, h) => ({ x: w * 0.1, y: h * 0.07, w: w * 0.8, h: h * 0.72 }),
    square: false,
    landscapeFriendly: false,
  },
  badge: {
    id: "badge",
    name: "Performance Badge",
    description: "Chamfered corners like a fender emblem.",
    path: badgePath,
    contentRect: (w, h) => ({ x: w * 0.07, y: h * 0.1, w: w * 0.86, h: h * 0.8 }),
    square: false,
    landscapeFriendly: true,
  },
  plate: {
    id: "plate",
    name: "License Plate",
    description: "Rounded plate with four bolts.",
    path: (w, h) => roundedRect(0, 0, w, h, Math.min(w, h) * 0.1),
    contentRect: (w, h) => ({ x: w * 0.08, y: h * 0.15, w: w * 0.84, h: h * 0.72 }),
    decoration: (w, h, accent) =>
      boltHoles(
        [
          [w * 0.05, h * 0.08],
          [w * 0.95, h * 0.08],
          [w * 0.05, h * 0.92],
          [w * 0.95, h * 0.92],
        ],
        Math.min(w, h) * 0.028,
        accent,
      ),
    square: false,
    landscapeFriendly: true,
  },
  raceplate: {
    id: "raceplate",
    name: "Race Plate",
    description: "Number-board with a colored header band.",
    path: racePlatePath,
    contentRect: (w, h) => ({ x: w * 0.07, y: h * 0.18, w: w * 0.86, h: h * 0.75 }),
    decoration: (w, h, accent, fg, opacity) =>
      `<path d="M0 ${Math.min(w, h) * 0.07}L${Math.min(w, h) * 0.07} 0H${w - Math.min(w, h) * 0.07}L${w} ${Math.min(w, h) * 0.07}V${h * 0.13}H0Z" fill="${accent}" opacity="${opacity}"/><rect x="0" y="${h * 0.13}" width="${w}" height="${Math.min(w, h) * 0.012}" fill="${fg}" opacity="0.6"/>`,
    square: false,
    landscapeFriendly: true,
  },
  gauge: {
    id: "gauge",
    name: "Gauge",
    description: "Tachometer bezel with tick marks.",
    path: circlePath,
    contentRect: (w, h) => {
      const b = squareBox(w, h);
      return { x: b.x + b.w * 0.2, y: b.y + b.h * 0.2, w: b.w * 0.6, h: b.h * 0.6 };
    },
    decoration: (w, h, accent, fg) => {
      const b = squareBox(w, h);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const r = b.w / 2;
      const parts: string[] = [];
      for (let i = 0; i < 36; i++) {
        const a = (Math.PI * 2 * i) / 36 - Math.PI / 2;
        const major = i % 3 === 0;
        const inner = r * (major ? 0.86 : 0.9);
        const outer = r * 0.95;
        parts.push(
          `<line x1="${cx + Math.cos(a) * inner}" y1="${cy + Math.sin(a) * inner}" x2="${cx + Math.cos(a) * outer}" y2="${cy + Math.sin(a) * outer}" stroke="${major ? fg : accent}" stroke-width="${r * (major ? 0.018 : 0.008)}" stroke-linecap="round"/>`,
        );
      }
      const start = -Math.PI / 2 + Math.PI * 0.15;
      const end = -Math.PI / 2 + Math.PI * 0.5;
      const rr = r * 0.905;
      parts.push(`<path d="M${cx + Math.cos(start) * rr} ${cy + Math.sin(start) * rr}A${rr} ${rr} 0 0 1 ${cx + Math.cos(end) * rr} ${cy + Math.sin(end) * rr}" stroke="${accent}" stroke-width="${r * 0.032}" fill="none"/>`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.985}" fill="none" stroke="${fg}" stroke-width="${r * 0.02}"/>`);
      return parts.join("");
    },
    square: true,
    landscapeFriendly: false,
  },
  tire: {
    id: "tire",
    name: "Tire",
    description: "Tread-block outer ring.",
    path: circlePath,
    contentRect: (w, h) => {
      const b = squareBox(w, h);
      return { x: b.x + b.w * 0.22, y: b.y + b.h * 0.22, w: b.w * 0.56, h: b.h * 0.56 };
    },
    decoration: (w, h, accent, fg) => {
      const b = squareBox(w, h);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const r = b.w / 2;
      const blocks: string[] = [];
      for (let i = 0; i < 28; i++) {
        const deg = (360 * i) / 28;
        blocks.push(`<rect x="${cx - r * 0.028}" y="${cy - r + r * 0.016}" width="${r * 0.056}" height="${r * 0.11}" rx="${r * 0.01}" fill="${accent}" transform="rotate(${deg} ${cx} ${cy})"/>`);
      }
      blocks.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="none" stroke="${fg}" stroke-width="${r * 0.016}" opacity="0.7"/>`);
      blocks.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.985}" fill="none" stroke="${fg}" stroke-width="${r * 0.012}" opacity="0.5"/>`);
      return blocks.join("");
    },
    square: true,
    landscapeFriendly: false,
  },
  wide: {
    id: "wide",
    name: "Wide Badge",
    description: "Stadium-shaped bar for wide sizes.",
    path: widePath,
    contentRect: (w, h) => ({ x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8 }),
    square: false,
    landscapeFriendly: true,
  },
};

export const SHAPE_LIST = Object.values(SHAPES);

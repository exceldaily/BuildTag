import type { LayoutId, TextLine } from "./types";

/**
 * Curated layouts. Each one decides where the QR block goes and which text
 * roles live above, below or beside it, plus which role gets the hero size.
 * Owners pick a layout; they never drag things around, so every design
 * stays printable.
 */

export type Role = TextLine["role"];

export interface LayoutDefinition {
  id: LayoutId;
  name: string;
  description: string;
  mode: "stack" | "row";
  /** For row mode: which side the QR sits on. */
  qrSide?: "left" | "right";
  top: Role[];
  bottom: Role[];
  /** Row mode: the text column. */
  side: Role[];
  /** Roles the layout does not list are appended here. */
  overflow: "top" | "bottom" | "side";
  hero: Role | null;
  /** Preferred QR block fraction of the content width (stack) or height (row). */
  qrFraction: number;
  textAlign: "middle" | "start";
}

export const LAYOUTS: Record<LayoutId, LayoutDefinition> = {
  "text-below": {
    id: "text-below",
    name: "QR Center / Text Below",
    description: "Code first, details underneath.",
    mode: "stack",
    top: ["logo"],
    bottom: ["headline", "vehicle", "nickname", "power", "torque", "mods", "social", "username", "custom", "cta"],
    side: [],
    overflow: "bottom",
    hero: null,
    qrFraction: 0.78,
    textAlign: "middle",
  },
  "text-above": {
    id: "text-above",
    name: "QR Center / Text Above",
    description: "Headline and specs over the code.",
    mode: "stack",
    top: ["logo", "headline", "vehicle", "nickname", "power", "torque", "mods", "social", "username", "custom"],
    bottom: ["cta"],
    side: [],
    overflow: "top",
    hero: null,
    qrFraction: 0.78,
    textAlign: "middle",
  },
  "qr-left": {
    id: "qr-left",
    name: "QR Left / Info Right",
    description: "Wide layout, code on the left.",
    mode: "row",
    qrSide: "left",
    top: [],
    bottom: [],
    side: ["logo", "headline", "vehicle", "nickname", "power", "torque", "mods", "social", "username", "custom", "cta"],
    overflow: "side",
    hero: "power",
    qrFraction: 0.92,
    textAlign: "start",
  },
  "qr-right": {
    id: "qr-right",
    name: "QR Right / Specs Left",
    description: "Wide layout, specs lead.",
    mode: "row",
    qrSide: "right",
    top: [],
    bottom: [],
    side: ["logo", "vehicle", "nickname", "power", "torque", "mods", "headline", "social", "username", "custom", "cta"],
    overflow: "side",
    hero: "power",
    qrFraction: 0.92,
    textAlign: "start",
  },
  badge: {
    id: "badge",
    name: "Badge",
    description: "Compact emblem: logo up top, model below.",
    mode: "stack",
    top: ["logo", "headline"],
    bottom: ["vehicle", "nickname", "power"],
    side: [],
    overflow: "bottom",
    hero: "nickname",
    qrFraction: 0.62,
    textAlign: "middle",
  },
  vertical: {
    id: "vertical",
    name: "Vertical",
    description: "Tall stack for narrow spaces.",
    mode: "stack",
    top: ["logo", "vehicle", "nickname"],
    bottom: ["power", "torque", "mods", "social", "headline", "custom", "cta"],
    side: [],
    overflow: "bottom",
    hero: "power",
    qrFraction: 0.9,
    textAlign: "middle",
  },
  wide: {
    id: "wide",
    name: "Wide",
    description: "Big number beside the code.",
    mode: "row",
    qrSide: "left",
    top: [],
    bottom: [],
    side: ["power", "vehicle", "nickname", "cta", "social", "torque", "mods", "headline", "username", "custom", "logo"],
    overflow: "side",
    hero: "power",
    qrFraction: 0.95,
    textAlign: "start",
  },
  social: {
    id: "social",
    name: "Social",
    description: "Handle-forward.",
    mode: "stack",
    top: ["logo", "headline"],
    bottom: ["social", "cta", "vehicle", "nickname", "power", "torque", "mods", "username", "custom"],
    side: [],
    overflow: "bottom",
    hero: "social",
    qrFraction: 0.72,
    textAlign: "middle",
  },
  power: {
    id: "power",
    name: "Power",
    description: "Question up top, the number below.",
    mode: "stack",
    top: ["headline", "logo"],
    bottom: ["power", "torque", "cta", "vehicle", "nickname", "mods", "social", "username", "custom"],
    side: [],
    overflow: "bottom",
    hero: "power",
    qrFraction: 0.7,
    textAlign: "middle",
  },
};

export const LAYOUT_LIST = Object.values(LAYOUTS);

/** Base font size per role as a fraction of the text column width. */
export const ROLE_SIZE: Record<Role, number> = {
  logo: 0.09,
  headline: 0.082,
  vehicle: 0.072,
  nickname: 0.084,
  power: 0.13,
  torque: 0.07,
  mods: 0.06,
  social: 0.072,
  username: 0.055,
  custom: 0.06,
  cta: 0.062,
};

export const HERO_MULTIPLIER = 1.55;

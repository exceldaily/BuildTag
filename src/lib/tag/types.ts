/**
 * BuildTag Designer domain model.
 *
 * A TagConfig is what gets saved in tag_designs.configuration_json. Vehicle
 * data (year, HP, handle, scan URL) is injected at render time so a saved
 * design keeps tracking the build.
 */

export type TemplateId = "stealth" | "power" | "social" | "spec" | "oem";

export type ShapeId =
  | "rectangle"
  | "rounded"
  | "square"
  | "circle"
  | "hex"
  | "shield"
  | "plate"
  | "gauge"
  | "tire"
  | "badge";

export type StyleId =
  | "minimal"
  | "oem"
  | "jdm"
  | "euro"
  | "muscle"
  | "track"
  | "offroad"
  | "carbon"
  | "tech";

export type FrameId =
  | "none"
  | "tire"
  | "wheel"
  | "turbo"
  | "gauge"
  | "piston"
  | "hex"
  | "plate"
  | "carbon";

export type SizePreset = "small" | "medium" | "large" | "custom";
export type SizeUnit = "in" | "mm";

export interface TagColors {
  /** Decal background inside the shape. */
  background: string;
  /** Primary text color. */
  foreground: string;
  /** Accent (stripes, rings, highlights). */
  accent: string;
  /** QR dark modules. */
  qrDark: string;
  /** QR light modules + quiet zone plate. Always painted, never transparent. */
  qrLight: string;
}

export interface TagContent {
  logo: boolean;
  qr: boolean;
  scanText: boolean;
  whatsDoneText: boolean;
  buildSheetText: boolean;
  year: boolean;
  make: boolean;
  model: boolean;
  nickname: boolean;
  horsepower: boolean;
  social: boolean;
  customText: string;
}

export interface TagSize {
  preset: SizePreset;
  /** Decal width in `unit`. Height follows the shape's aspect ratio. */
  width: number;
  unit: SizeUnit;
}

export interface TagConfig {
  version: 1;
  template: TemplateId;
  shape: ShapeId;
  style: StyleId;
  frame: FrameId;
  size: TagSize;
  colors: TagColors;
  content: TagContent;
  /** Custom CTA line; empty uses the template default ("SCAN THE BUILD"). */
  ctaText: string;
}

/** Vehicle facts injected at render time. */
export interface TagData {
  scanUrl: string;
  year: number | null;
  make: string;
  model: string;
  nickname: string;
  /** e.g. "612 WHP" or "" */
  powerLabel: string;
  /** e.g. "@ghost_supra" or "" */
  socialHandle: string;
}

export interface TextLine {
  role: "logo" | "headline" | "vehicle" | "nickname" | "power" | "social" | "custom" | "cta";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  anchor: "start" | "middle" | "end";
  letterSpacing: number;
  fontFamily: string;
  weight: number;
  color: string;
}

export interface QrPlacement {
  /** Square allocated to the QR + its optional frame. */
  frameX: number;
  frameY: number;
  frameSize: number;
  /** QR block INCLUDING the quiet zone (the protected area). */
  x: number;
  y: number;
  size: number;
  /** Modules per side including quiet zone. */
  totalModules: number;
  /** Rendered size of one module in layout units. */
  moduleSize: number;
}

export interface TagLayout {
  width: number;
  height: number;
  contentRect: { x: number; y: number; w: number; h: number };
  qr: QrPlacement | null;
  lines: TextLine[];
  landscape: boolean;
}

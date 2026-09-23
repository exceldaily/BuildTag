/**
 * BuildTag Designer domain model (configuration v2).
 *
 * A TagConfig is what gets saved in tag_designs.configuration_json and frozen
 * into tag_production_snapshots. Vehicle facts (TagData) are injected at
 * render time for live designs; snapshots carry their own frozen data.
 */

export type TemplateId =
  | "stealth"
  | "oem"
  | "jdm"
  | "euro"
  | "muscle"
  | "track"
  | "offroad"
  | "carbon"
  | "techspec"
  | "power"
  | "social"
  | "buildsheet"
  | "minimalqr";

export type ShapeId =
  | "rectangle"
  | "rounded"
  | "square"
  | "circle"
  | "hex"
  | "shield"
  | "badge"
  | "plate"
  | "raceplate"
  | "gauge"
  | "tire"
  | "wide";

export type LayoutId =
  | "text-above"
  | "text-below"
  | "qr-left"
  | "qr-right"
  | "badge"
  | "vertical"
  | "wide"
  | "social"
  | "power";

export type FontId = "condensed" | "technical" | "motorsport" | "heavy" | "minimal" | "industrial";

export type QrModuleStyle = "classic" | "soft" | "rounded" | "dots" | "diamond" | "technical" | "pixel" | "performance";
export type QrFinderStyle = "classic" | "rounded" | "double-ring" | "performance" | "hex" | "minimal";
export type QrLogoKind = "none" | "buildtag" | "upload" | "shop";

export type FrameId =
  | "none"
  | "tire"
  | "wheel"
  | "turbo"
  | "tachometer"
  | "piston"
  | "hex"
  | "raceplate"
  | "plate"
  | "carbon"
  | "engineering";

export type BackgroundKind = "solid" | "transparent" | "carbon" | "grid" | "stripe" | "honeycomb" | "brushed" | "image";

export type SizeId = "small" | "standard" | "wide" | "large" | "custom";
export type SizeUnit = "in" | "mm";
export type MaterialId = "gloss" | "matte" | "transparent" | "reflective" | "holographic";

export type CtaPreset =
  | "scan"
  | "whats-done"
  | "build-sheet"
  | "full-build"
  | "see-mods"
  | "see-whats-done"
  | "view-build"
  | "built-not-bought"
  | "custom"
  | "none";

export interface TagColors {
  background: string;
  foreground: string;
  accent: string;
  qrDark: string;
  qrLight: string;
}

export interface QrConfig {
  moduleStyle: QrModuleStyle;
  finderStyle: QrFinderStyle;
  logo: {
    kind: QrLogoKind;
    /** Public URL for uploaded / shop artwork. */
    url: string | null;
    /** Logo width as a fraction of the QR code side (without quiet zone). Clamped by the safety engine. */
    scale: number;
  };
  /** QR block size multiplier applied by the layout (0.6..1). */
  scale: number;
}

export interface TextFields {
  year: boolean;
  make: boolean;
  model: boolean;
  trim: boolean;
  nickname: boolean;
  power: boolean;
  torque: boolean;
  modCount: boolean;
  social: boolean;
  username: boolean;
}

export interface TextConfig {
  logo: boolean;
  headline: "none" | "whats-done" | "build-sheet" | "custom";
  headlineCustom: string;
  cta: CtaPreset;
  ctaCustom: string;
  fields: TextFields;
  custom: string;
}

export interface SocialConfig {
  /** "auto" = first public vehicle social, then owner; otherwise a social public_id. */
  source: string;
  showIcon: boolean;
}

export interface BackgroundConfig {
  kind: BackgroundKind;
  imageUrl: string | null;
  /** 0..1 darkening applied over image backgrounds so text stays legible. */
  imageDim: number;
}

export interface TagSize {
  id: SizeId;
  width: number;
  height: number;
  unit: SizeUnit;
}

export interface TagConfig {
  version: 2;
  template: TemplateId;
  shape: ShapeId;
  layout: LayoutId;
  font: FontId;
  qr: QrConfig;
  frame: FrameId;
  colors: TagColors;
  text: TextConfig;
  social: SocialConfig;
  background: BackgroundConfig;
  size: TagSize;
  material: MaterialId;
  advanced: {
    /** Extra text scale (0.7..1.3). */
    textScale: number;
    /** Draw a thin border in the accent color inside the cut line. */
    border: boolean;
    /** Decorative stripe/accent opacity (0..1). */
    decorOpacity: number;
  };
}

export interface TagSocial {
  public_id: string;
  platform: string;
  handle: string;
  source: "vehicle" | "owner";
}

/** Vehicle facts injected at render time. */
export interface TagData {
  scanUrl: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  /** e.g. "450 WHP" or "" */
  powerLabel: string;
  /** e.g. "400 WTQ" or "" */
  torqueLabel: string;
  modCount: number;
  username: string;
  socials: TagSocial[];
}

export interface TextLine {
  role: "logo" | "headline" | "vehicle" | "nickname" | "power" | "torque" | "mods" | "social" | "username" | "custom" | "cta";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  anchor: "start" | "middle" | "end";
  letterSpacing: number;
  font: FontId;
  color: string;
  /** Social platform for the icon drawn before the handle, when enabled. */
  icon?: string;
}

export interface QrPlacement {
  frameX: number;
  frameY: number;
  frameSize: number;
  /** QR block INCLUDING the quiet zone (the protected area). */
  x: number;
  y: number;
  size: number;
  totalModules: number;
  moduleSize: number;
  /** Modules per side without the quiet zone. */
  matrixSize: number;
}

export interface TagLayout {
  width: number;
  height: number;
  contentRect: { x: number; y: number; w: number; h: number };
  qr: QrPlacement | null;
  lines: TextLine[];
  /** Bounds of the wordmark image when text.logo is on and the layout draws it as artwork. */
  logoBox: { x: number; y: number; w: number; h: number } | null;
}

/**
 * Shape of the first designer release's configuration (v1). Kept only so
 * saved designs migrate cleanly through normalizeConfig().
 */
export type TemplateId = import("./types").TemplateId;
export type CtaPreset = import("./types").CtaPreset;
export type TextFields = import("./types").TextFields;

export interface TagContent_Legacy {
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

export interface TagConfig {
  version: 1;
  template: string;
  shape: string;
  style: string;
  frame: string;
  size: { preset: string; width: number; unit: "in" | "mm" };
  colors: { background: string; foreground: string; accent: string; qrDark: string; qrLight: string };
  content: TagContent_Legacy;
  ctaText: string;
}

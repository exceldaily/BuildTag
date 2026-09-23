import { STYLES } from "./styles";
import type { TagConfig, TagContent, TemplateId } from "./types";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  build: () => TagConfig;
}

const baseContent: TagContent = {
  logo: false,
  qr: true,
  scanText: false,
  whatsDoneText: false,
  buildSheetText: false,
  year: false,
  make: false,
  model: false,
  nickname: false,
  horsepower: false,
  social: false,
  customText: "",
};

function base(overrides: Omit<Partial<TagConfig>, "content"> & { content?: Partial<TagContent> }): TagConfig {
  const style = STYLES[overrides.style ?? "minimal"];
  return {
    version: 1,
    template: overrides.template ?? "stealth",
    shape: overrides.shape ?? "rounded",
    style: style.id,
    frame: overrides.frame ?? "none",
    size: overrides.size ?? { preset: "medium", width: 3, unit: "in" },
    colors: { ...style.colors, ...(overrides.colors ?? {}) },
    content: { ...baseContent, ...(overrides.content ?? {}) },
    ctaText: overrides.ctaText ?? "",
  };
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  stealth: {
    id: "stealth",
    name: "Stealth",
    description: "Logo, QR, scan prompt. Nothing else.",
    build: () =>
      base({
        template: "stealth",
        shape: "rounded",
        style: "minimal",
        content: { logo: true, scanText: true },
      }),
  },
  power: {
    id: "power",
    name: "Power",
    description: "Leads with the question, answers with the number.",
    build: () =>
      base({
        template: "power",
        shape: "rounded",
        style: "muscle",
        content: { whatsDoneText: true, horsepower: true, scanText: true },
      }),
  },
  social: {
    id: "social",
    name: "Social",
    description: "QR plus the vehicle's handle.",
    build: () =>
      base({
        template: "social",
        shape: "square",
        style: "jdm",
        content: { social: true, scanText: true },
      }),
  },
  spec: {
    id: "spec",
    name: "Spec",
    description: "Year, model and power above the code.",
    build: () =>
      base({
        template: "spec",
        shape: "rectangle",
        style: "tech",
        content: { year: true, model: true, horsepower: true, logo: true },
        ctaText: "FULL BUILD →",
      }),
  },
  oem: {
    id: "oem",
    name: "OEM",
    description: "Small premium badge for a fender or dash.",
    build: () =>
      base({
        template: "oem",
        shape: "badge",
        style: "oem",
        size: { preset: "small", width: 2.5, unit: "in" },
        content: { logo: true, model: true, horsepower: true },
      }),
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export const SIZE_PRESETS: { id: "small" | "medium" | "large"; label: string; inches: number }[] = [
  { id: "small", label: "Small", inches: 2 },
  { id: "medium", label: "Medium", inches: 3 },
  { id: "large", label: "Large", inches: 4 },
];

export const DEFAULT_CTA = "SCAN THE BUILD";

/** Coerces stored JSON into a valid config, falling back per-field. */
export function normalizeConfig(input: unknown): TagConfig {
  const fallback = TEMPLATES.stealth.build();
  if (!input || typeof input !== "object") return fallback;
  const c = input as Partial<TagConfig>;
  const template = c.template && TEMPLATES[c.template] ? c.template : fallback.template;
  const style = c.style && STYLES[c.style] ? c.style : fallback.style;
  const styleColors = STYLES[style].colors;
  const sizeWidth = Number(c.size?.width);
  return {
    version: 1,
    template,
    shape: c.shape ?? fallback.shape,
    style,
    frame: c.frame ?? "none",
    size: {
      preset: c.size?.preset ?? "medium",
      width: Number.isFinite(sizeWidth) && sizeWidth > 0 ? sizeWidth : 3,
      unit: c.size?.unit === "mm" ? "mm" : "in",
    },
    colors: { ...styleColors, ...(c.colors ?? {}) },
    content: { ...fallback.content, ...(c.content ?? {}) },
    ctaText: typeof c.ctaText === "string" ? c.ctaText.slice(0, 40) : "",
  };
}

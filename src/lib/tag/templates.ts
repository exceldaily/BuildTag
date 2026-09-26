import { PALETTE_BY_ID } from "./palettes";
import { sizeFromPreset } from "./sizes";
import type { CtaPreset, TagConfig, TagContent_Legacy, TextFields, TemplateId } from "./types-legacy";
import type { TagConfig as TagConfigV2, TextConfig } from "./types";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  build: () => TagConfigV2;
}

const NO_FIELDS: TextFields = {
  year: false,
  make: false,
  model: false,
  trim: false,
  nickname: false,
  power: false,
  torque: false,
  modCount: false,
  social: false,
  username: false,
};

function text(overrides: Omit<Partial<TextConfig>, "fields"> & { fields?: Partial<TextFields> }): TextConfig {
  return {
    logo: overrides.logo ?? false,
    headline: overrides.headline ?? "none",
    headlineCustom: overrides.headlineCustom ?? "",
    cta: overrides.cta ?? "scan",
    ctaCustom: overrides.ctaCustom ?? "",
    fields: { ...NO_FIELDS, ...(overrides.fields ?? {}) },
    custom: overrides.custom ?? "",
  };
}

type Partialish = Omit<Partial<TagConfigV2>, "text" | "qr" | "colors" | "background" | "advanced" | "social" | "size"> & {
  palette?: string;
  text?: TextConfig;
  qr?: Partial<TagConfigV2["qr"]>;
  background?: Partial<TagConfigV2["background"]>;
  advanced?: Partial<TagConfigV2["advanced"]>;
  social?: Partial<TagConfigV2["social"]>;
  size?: TagConfigV2["size"];
};

function base(o: Partialish): TagConfigV2 {
  const palette = PALETTE_BY_ID[o.palette ?? "stealth"] ?? PALETTE_BY_ID.stealth;
  return {
    version: 2,
    template: o.template ?? "stealth",
    shape: o.shape ?? "rounded",
    layout: o.layout ?? "text-below",
    font: o.font ?? "condensed",
    qr: {
      moduleStyle: o.qr?.moduleStyle ?? "classic",
      finderStyle: o.qr?.finderStyle ?? "classic",
      logo: o.qr?.logo ?? { kind: "none", url: null, scale: 0.18 },
      scale: o.qr?.scale ?? 1,
    },
    frame: o.frame ?? "none",
    colors: { ...palette.colors },
    text: o.text ?? text({ logo: true, cta: "scan" }),
    social: { source: o.social?.source ?? "auto", showIcon: o.social?.showIcon ?? true },
    background: { kind: o.background?.kind ?? "solid", imageUrl: o.background?.imageUrl ?? null, imageDim: o.background?.imageDim ?? 0.55 },
    size: o.size ?? sizeFromPreset("standard"),
    material: o.material ?? "gloss",
    advanced: { textScale: o.advanced?.textScale ?? 1, border: o.advanced?.border ?? false, decorOpacity: o.advanced?.decorOpacity ?? 0.9 },
  };
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  stealth: {
    id: "stealth",
    name: "Stealth",
    tagline: "Black on black.",
    description: "Minimal performance badge: wordmark, code, scan prompt.",
    build: () => base({ template: "stealth", shape: "rounded", layout: "text-below", font: "minimal", palette: "stealth", text: text({ logo: true, cta: "scan" }), qr: { moduleStyle: "soft", finderStyle: "rounded" } }),
  },
  oem: {
    id: "oem",
    name: "OEM+",
    tagline: "Factory badge energy.",
    description: "Chamfered badge, brushed finish, model and power like a trim emblem.",
    build: () =>
      base({
        template: "oem",
        shape: "badge",
        layout: "badge",
        font: "technical",
        palette: "gunmetal",
        background: { kind: "brushed" },
        text: text({ logo: true, cta: "none", fields: { model: true, power: true } }),
        qr: { moduleStyle: "technical", finderStyle: "performance" },
        advanced: { border: true, decorOpacity: 0.7 },
        size: sizeFromPreset("small"),
      }),
  },
  jdm: {
    id: "jdm",
    name: "JDM",
    tagline: "Rising sun, red stripe.",
    description: "White plate, red accents, heavy type, race-plate header.",
    build: () =>
      base({
        template: "jdm",
        shape: "raceplate",
        layout: "text-below",
        font: "heavy",
        palette: "racing-red",
        text: text({ logo: false, headline: "whats-done", cta: "see-mods", fields: { nickname: true, social: true } }),
        qr: { moduleStyle: "classic", finderStyle: "classic" },
        background: { kind: "solid" },
        advanced: { decorOpacity: 1 },
      }),
  },
  euro: {
    id: "euro",
    name: "Euro",
    tagline: "Clean, wide, precise.",
    description: "Navy plate, thin lines, code left and specs right.",
    build: () =>
      base({
        template: "euro",
        shape: "plate",
        layout: "qr-left",
        font: "minimal",
        palette: "electric-blue",
        text: text({ logo: true, cta: "view-build", fields: { year: true, make: true, model: true, power: true, torque: true } }),
        qr: { moduleStyle: "soft", finderStyle: "rounded" },
        size: sizeFromPreset("wide"),
        advanced: { border: true },
      }),
  },
  muscle: {
    id: "muscle",
    name: "Muscle",
    tagline: "Stripes and horsepower.",
    description: "Racing stripes, huge power figure, bold American type.",
    build: () =>
      base({
        template: "muscle",
        shape: "rectangle",
        layout: "power",
        font: "heavy",
        palette: "racing-red",
        background: { kind: "stripe" },
        text: text({ logo: false, headline: "whats-done", cta: "scan", fields: { power: true } }),
        qr: { moduleStyle: "classic", finderStyle: "performance" },
      }),
  },
  track: {
    id: "track",
    name: "Track",
    tagline: "Race number board.",
    description: "Yellow-and-black motorsport plate with the tachometer frame.",
    build: () =>
      base({
        template: "track",
        shape: "raceplate",
        layout: "text-below",
        font: "motorsport",
        palette: "track",
        frame: "tachometer",
        text: text({ logo: true, cta: "scan", fields: { nickname: true, power: true } }),
        qr: { moduleStyle: "classic", finderStyle: "classic" },
        advanced: { decorOpacity: 1 },
      }),
  },
  offroad: {
    id: "offroad",
    name: "Off-Road",
    tagline: "Dust, bolts, tread.",
    description: "Olive and tan, honeycomb texture, tire frame around the code.",
    build: () =>
      base({
        template: "offroad",
        shape: "hex",
        layout: "text-below",
        font: "industrial",
        palette: "bronze",
        frame: "tire",
        background: { kind: "honeycomb" },
        text: text({ logo: false, cta: "built-not-bought", fields: { model: true, nickname: true } }),
        qr: { moduleStyle: "pixel", finderStyle: "classic" },
        size: sizeFromPreset("large"),
      }),
  },
  carbon: {
    id: "carbon",
    name: "Carbon",
    tagline: "Weave and glow.",
    description: "Carbon background, carbon badge frame, red accent.",
    build: () =>
      base({
        template: "carbon",
        shape: "rounded",
        layout: "text-below",
        font: "condensed",
        palette: "racing-red",
        frame: "carbon",
        background: { kind: "carbon" },
        text: text({ logo: true, cta: "scan", fields: { power: true } }),
        qr: { moduleStyle: "rounded", finderStyle: "rounded" },
      }),
  },
  techspec: {
    id: "techspec",
    name: "Tech Spec",
    tagline: "Blueprint sheet.",
    description: "Grid background, engineering frame, mono specs.",
    build: () =>
      base({
        template: "techspec",
        shape: "rectangle",
        layout: "qr-right",
        font: "technical",
        palette: "cyan",
        frame: "engineering",
        background: { kind: "grid" },
        text: text({ logo: true, headline: "build-sheet", cta: "full-build", fields: { year: true, make: true, model: true, power: true, torque: true, modCount: true } }),
        qr: { moduleStyle: "technical", finderStyle: "minimal" },
        size: sizeFromPreset("wide"),
      }),
  },
  power: {
    id: "power",
    name: "Power",
    tagline: "Leads with the number.",
    description: "Question up top, the dyno figure underneath.",
    build: () =>
      base({
        template: "power",
        shape: "rounded",
        layout: "power",
        font: "condensed",
        palette: "neon",
        text: text({ logo: false, headline: "whats-done", cta: "scan", fields: { power: true } }),
        qr: { moduleStyle: "performance", finderStyle: "performance" },
      }),
  },
  social: {
    id: "social",
    name: "Social",
    tagline: "Follow the car.",
    description: "Square badge, handle with icon under the code.",
    build: () =>
      base({
        template: "social",
        shape: "square",
        layout: "social",
        font: "condensed",
        palette: "black-white",
        text: text({ logo: false, cta: "scan", fields: { social: true } }),
        social: { source: "auto", showIcon: true },
        qr: { moduleStyle: "dots", finderStyle: "double-ring" },
      }),
  },
  buildsheet: {
    id: "buildsheet",
    name: "Build Sheet",
    tagline: "Everything on one plate.",
    description: "Wide plate listing year, model, power, torque and mod count.",
    build: () =>
      base({
        template: "buildsheet",
        shape: "wide",
        layout: "wide",
        font: "condensed",
        palette: "silver",
        text: text({ logo: true, headline: "build-sheet", cta: "see-whats-done", fields: { year: true, make: true, model: true, power: true, torque: true, modCount: true } }),
        qr: { moduleStyle: "soft", finderStyle: "rounded" },
        size: sizeFromPreset("wide"),
      }),
  },
  minimalqr: {
    id: "minimalqr",
    name: "Minimal QR",
    tagline: "Just the code.",
    description: "Whiteout, no text, code only with a fine border.",
    build: () =>
      base({
        template: "minimalqr",
        shape: "square",
        layout: "text-below",
        font: "minimal",
        palette: "whiteout",
        text: text({ logo: false, cta: "none" }),
        qr: { moduleStyle: "classic", finderStyle: "classic", scale: 1 },
        advanced: { border: true },
        size: sizeFromPreset("small"),
      }),
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export const CTA_PRESETS: { id: CtaPreset; label: string }[] = [
  { id: "scan", label: "SCAN THE BUILD" },
  { id: "whats-done", label: "WHAT'S DONE TO IT?" },
  { id: "build-sheet", label: "BUILD SHEET" },
  { id: "full-build", label: "SEE THE FULL BUILD" },
  { id: "see-mods", label: "SEE THE MODS" },
  { id: "see-whats-done", label: "SEE WHAT'S DONE" },
  { id: "view-build", label: "VIEW THE BUILD" },
  { id: "built-not-bought", label: "BUILT NOT BOUGHT" },
  { id: "custom", label: "Custom…" },
  { id: "none", label: "None" },
];

export function ctaText(cta: CtaPreset, custom: string): string {
  if (cta === "none") return "";
  if (cta === "custom") return custom.trim();
  return CTA_PRESETS.find((c) => c.id === cta)?.label ?? "";
}

/* ---------------------------------------------------------------------------
 * Normalization: accepts v2 configs, v1 configs (first designer release) and
 * garbage, always returning a valid v2 config.
 * ------------------------------------------------------------------------- */

const V1_STYLE_TO_TEMPLATE: Record<string, TemplateId> = {
  minimal: "stealth",
  oem: "oem",
  jdm: "jdm",
  euro: "euro",
  muscle: "muscle",
  track: "track",
  offroad: "offroad",
  carbon: "carbon",
  tech: "techspec",
};

function migrateV1(c: TagConfig): TagConfigV2 {
  const templateId: TemplateId = TEMPLATES[c.template as TemplateId] ? (c.template as TemplateId) : (V1_STYLE_TO_TEMPLATE[c.style] ?? "stealth");
  const t = TEMPLATES[templateId].build();
  const content: Partial<TagContent_Legacy> = c.content ?? {};
  const widthIn = c.size?.unit === "mm" ? (c.size.width ?? 76) / 25.4 : (c.size?.width ?? 3);
  const sizeId = widthIn <= 3.2 ? "small" : widthIn >= 4.8 ? "large" : "standard";
  return {
    ...t,
    template: templateId,
    shape: (c.shape as TagConfigV2["shape"]) ?? t.shape,
    frame: c.frame === "gauge" ? "tachometer" : ((c.frame as TagConfigV2["frame"]) ?? "none"),
    colors: { ...t.colors, ...(c.colors ?? {}) },
    size: sizeFromPreset(sizeId),
    text: {
      ...t.text,
      logo: Boolean(content.logo),
      headline: content.whatsDoneText ? "whats-done" : content.buildSheetText ? "build-sheet" : "none",
      cta: c.ctaText?.trim() ? "custom" : content.scanText ? "scan" : "none",
      ctaCustom: c.ctaText?.trim() ?? "",
      custom: content.customText ?? "",
      fields: {
        ...t.text.fields,
        year: Boolean(content.year),
        make: Boolean(content.make),
        model: Boolean(content.model),
        nickname: Boolean(content.nickname),
        power: Boolean(content.horsepower),
        social: Boolean(content.social),
      },
    },
  };
}

export function normalizeConfig(input: unknown): TagConfigV2 {
  const fallback = TEMPLATES.stealth.build();
  if (!input || typeof input !== "object") return fallback;
  const raw = input as { version?: number };
  if (raw.version !== 2) {
    return migrateV1(input as TagConfig);
  }
  const c = input as Partial<TagConfigV2>;
  const templateId: TemplateId = c.template && TEMPLATES[c.template] ? c.template : "stealth";
  const t = TEMPLATES[templateId].build();
  const num = (v: unknown, d: number, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
  return {
    version: 2,
    template: templateId,
    shape: c.shape ?? t.shape,
    layout: c.layout ?? t.layout,
    font: c.font ?? t.font,
    qr: {
      moduleStyle: c.qr?.moduleStyle ?? t.qr.moduleStyle,
      finderStyle: c.qr?.finderStyle ?? t.qr.finderStyle,
      logo: {
        kind: c.qr?.logo?.kind ?? "none",
        url: typeof c.qr?.logo?.url === "string" ? c.qr.logo.url : null,
        scale: num(c.qr?.logo?.scale, 0.18, 0.1, 0.3),
      },
      scale: num(c.qr?.scale, 1, 0.6, 1),
    },
    frame: c.frame ?? t.frame,
    colors: { ...t.colors, ...(c.colors ?? {}) },
    text: {
      logo: c.text?.logo ?? t.text.logo,
      headline: c.text?.headline ?? t.text.headline,
      headlineCustom: (c.text?.headlineCustom ?? "").slice(0, 40),
      cta: c.text?.cta ?? t.text.cta,
      ctaCustom: (c.text?.ctaCustom ?? "").slice(0, 40),
      fields: { ...t.text.fields, ...(c.text?.fields ?? {}) },
      custom: (c.text?.custom ?? "").slice(0, 40),
    },
    social: { source: c.social?.source ?? "auto", showIcon: c.social?.showIcon ?? true },
    background: {
      kind: c.background?.kind ?? t.background.kind,
      imageUrl: typeof c.background?.imageUrl === "string" ? c.background.imageUrl : null,
      imageDim: num(c.background?.imageDim, 0.55, 0, 0.9),
    },
    size: {
      id: c.size?.id ?? t.size.id,
      width: num(c.size?.width, t.size.width, 1, 600),
      height: num(c.size?.height, t.size.height, 1, 600),
      unit: c.size?.unit === "mm" ? "mm" : "in",
    },
    material: c.material ?? "gloss",
    advanced: {
      textScale: num(c.advanced?.textScale, 1, 0.7, 1.3),
      border: c.advanced?.border ?? t.advanced.border,
      decorOpacity: num(c.advanced?.decorOpacity, 0.9, 0, 1),
    },
  };
}

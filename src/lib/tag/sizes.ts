import type { MaterialId, SizeId, TagSize } from "./types";

/**
 * Physical sizes and materials. Print specifications in the database are
 * the source of truth for what can be ORDERED; this file drives the
 * designer UI and export geometry.
 */
export interface SizePreset {
  id: Exclude<SizeId, "custom">;
  name: string;
  width: number;
  height: number;
  hint: string;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: "small", name: "Small", width: 3, height: 3, hint: "Quarter window, dash, toolbox" },
  { id: "standard", name: "Standard", width: 4, height: 4, hint: "Rear window, bumper" },
  { id: "wide", name: "Wide", width: 5, height: 3, hint: "Plate-style, body panel" },
  { id: "large", name: "Large", width: 5, height: 5, hint: "Show cars, garage door" },
];

export function sizeFromPreset(id: Exclude<SizeId, "custom">, unit: "in" | "mm" = "in"): TagSize {
  const p = SIZE_PRESETS.find((s) => s.id === id) ?? SIZE_PRESETS[1];
  const k = unit === "mm" ? 25.4 : 1;
  return { id: p.id, width: Math.round(p.width * k * 100) / 100, height: Math.round(p.height * k * 100) / 100, unit };
}

export function toInches(size: TagSize): { width: number; height: number } {
  const k = size.unit === "mm" ? 1 / 25.4 : 1;
  return { width: size.width * k, height: size.height * k };
}

export function formatSize(size: TagSize): string {
  const inches = toInches(size);
  const mm = { w: inches.width * 25.4, h: inches.height * 25.4 };
  return `${inches.width.toFixed(2).replace(/\.?0+$/, "")} × ${inches.height.toFixed(2).replace(/\.?0+$/, "")} in  (${Math.round(mm.w)} × ${Math.round(mm.h)} mm)`;
}

export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  description: string;
  /** Preview treatment drawn over the artwork (preview only). */
  preview: "gloss" | "matte" | "transparent" | "reflective" | "holographic";
}

export const MATERIALS: MaterialDefinition[] = [
  { id: "gloss", name: "Standard Gloss", description: "Durable outdoor vinyl, glossy laminate.", preview: "gloss" },
  { id: "matte", name: "Standard Matte", description: "Same vinyl, anti-glare matte laminate.", preview: "matte" },
  { id: "transparent", name: "Transparent", description: "Clear vinyl; the paint shows through around the QR plate.", preview: "transparent" },
  { id: "reflective", name: "Reflective", description: "Retro-reflective film that lights up under headlights.", preview: "reflective" },
  { id: "holographic", name: "Holographic", description: "Color-shifting prismatic film.", preview: "holographic" },
];

export const MATERIAL_BY_ID: Record<MaterialId, MaterialDefinition> = Object.fromEntries(MATERIALS.map((m) => [m.id, m])) as Record<MaterialId, MaterialDefinition>;

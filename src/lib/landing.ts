import "server-only";

import { anonClient, buildCrew, exploreBuilds, getCrew } from "@/lib/db/public";
import { siteUrl } from "@/lib/env";
import { landingOrigin } from "@/lib/landing-config";
import { scanUrl } from "@/lib/qr/generate";
import * as opentype from "opentype.js";

import { FONTS, TEMPLATES, layoutTag, renderTagSvg } from "@/lib/tag";
import type { FontId, TagData, TemplateId, TextLine } from "@/lib/tag/types";
import type { LandingBuildKey } from "@/lib/landing-config";
import type { Crew, PublicBuild, PublicBuildListRow } from "@/lib/types";
import { powerLabel, torqueLabel } from "@/lib/utils";

/**
 * Homepage data. Everything shown on the landing page comes from real public
 * builds, fetched through the same anon RPCs as the public pages. Missing,
 * private or deleted builds come back as null and their sections degrade.
 */

/** Curated public demo builds and communities (all owned by demo accounts). */
export const LANDING_SLUGS = {
  car: "ghost-2022-toyota-gr-supra",
  bagger: "dusk-2020-harley-davidson-street-glide",
  sportbike: "rosso-2021-ducati-panigale-v2",
  shopBuild: "nightshift-2026-harley-davidson-road-glide",
  crew: "example-customs",
  shop: "blackline-performance",
} as const;

/**
 * Origin encoded in homepage QR codes. Production encodes its own origin;
 * local and preview environments still encode the live site so the demo
 * code scans from any phone.
 */
export function demoOrigin(): string {
  return landingOrigin(siteUrl());
}

export function demoScanUrl(code: string): string {
  return scanUrl(demoOrigin(), code);
}

async function publicBuild(slug: string): Promise<PublicBuild | null> {
  try {
    const { data, error } = await anonClient().rpc("get_public_build", { p_slug: slug, p_visitor_key: null });
    if (error || !data) return null;
    const res = data as unknown as { access: string; build?: PublicBuild };
    return res.access === "ok" && res.build && res.build.visibility === "public" ? res.build : null;
  } catch {
    return null;
  }
}

export interface LandingData {
  car: PublicBuild | null;
  bagger: PublicBuild | null;
  sportbike: PublicBuild | null;
  shopBuild: PublicBuild | null;
  carCrew: { name: string; slug: string } | null;
  crew: Crew | null;
  builds: PublicBuildListRow[];
}

export async function loadLanding(): Promise<LandingData> {
  const [car, bagger, sportbike, shopBuild, carCrew, crew, explore] = await Promise.all([
    publicBuild(LANDING_SLUGS.car),
    publicBuild(LANDING_SLUGS.bagger),
    publicBuild(LANDING_SLUGS.sportbike),
    publicBuild(LANDING_SLUGS.shopBuild),
    buildCrew(LANDING_SLUGS.car).catch(() => null),
    getCrew(LANDING_SLUGS.crew).catch(() => null),
    exploreBuilds({ sort: "scanned", pageSize: 4 }).catch(() => null),
  ]);
  return { car, bagger, sportbike, shopBuild, carCrew, crew, builds: explore?.builds ?? [] };
}

/** The same data the Designer feeds the renderer, from a public build. */
export function tagDataFor(b: PublicBuild): TagData | null {
  if (!b.qr_code) return null;
  return {
    scanUrl: demoScanUrl(b.qr_code),
    year: b.year,
    make: b.make,
    model: b.model,
    trim: b.trim,
    nickname: b.nickname,
    powerLabel: powerLabel(b.horsepower, b.horsepower_type),
    torqueLabel: torqueLabel(b.torque, b.torque_unit, b.horsepower_type),
    modCount: b.mod_count,
    username: b.owner?.username ?? "",
    socials: b.vehicle_socials.filter((s) => s.handle).map((s) => ({ public_id: s.public_id, platform: s.platform, handle: s.handle, source: "vehicle" as const })),
  };
}

/** Public demo build for one of the homepage slots. */
export function landingBuild(key: LandingBuildKey): Promise<PublicBuild | null> {
  return publicBuild(LANDING_SLUGS[key]);
}

/** A homepage decal image: served by /api/landing/decal, sized for layout stability. */
export interface DecalImage {
  src: string;
  width: number;
  height: number;
  label: string;
}

/**
 * Where the homepage loads a decal from. The artwork itself is rendered by the
 * decal route (text converted to paths), so the page HTML stays light.
 */
export function decalImage(b: PublicBuild | null, key: LandingBuildKey, template: TemplateId): DecalImage | null {
  if (!b) return null;
  const data = tagDataFor(b);
  if (!data) return null;
  const layout = layoutTag(TEMPLATES[template].build(), data);
  return {
    src: `/api/landing/decal/${template}/${key}`,
    width: Math.round(layout.width),
    height: Math.round(layout.height),
    label: `${TEMPLATES[template].name} BuildTag for ${b.nickname || `${b.year ?? ""} ${b.make} ${b.model}`.trim()}. Scan it to open the build.`,
  };
}

const fontCache = new Map<FontId, Promise<opentype.Font>>();

function loadFontFrom(origin: string, id: FontId): Promise<opentype.Font> {
  let p = fontCache.get(id);
  if (!p) {
    p = fetch(new URL(FONTS[id].file, origin))
      .then((r) => {
        if (!r.ok) throw new Error(`font ${id}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => opentype.parse(buf));
    p.catch(() => fontCache.delete(id));
    fontCache.set(id, p);
  }
  return p;
}

/**
 * Path-only decal SVG (the same text-to-path step the Designer export uses),
 * so it renders identically as an <img> without page fonts.
 */
export async function renderDecalSvg(b: PublicBuild, template: TemplateId, fontOrigin: string): Promise<string | null> {
  const data = tagDataFor(b);
  if (!data) return null;
  const config = TEMPLATES[template].build();
  const layout = layoutTag(config, data);
  const fonts = new Map<FontId, opentype.Font>();
  await Promise.all([...new Set(layout.lines.map((l) => l.font))].map(async (id) => fonts.set(id, await loadFontFrom(fontOrigin, id))));
  const textToPath = (line: TextLine): string | null => {
    const font = fonts.get(line.font);
    if (!font) return null;
    const opts = { letterSpacing: line.letterSpacing / line.fontSize, kerning: true };
    const width = font.getAdvanceWidth(line.text, line.fontSize, opts);
    const x = line.anchor === "middle" ? line.x - width / 2 : line.anchor === "end" ? line.x - width : line.x;
    const d = font.getPath(line.text, x, line.y, line.fontSize, opts).toPathData(3);
    return d.includes("NaN") ? null : d;
  };
  return renderTagSvg(config, data, { idPrefix: `d-${template}`, material: false, textToPath }).svg;
}

/**
 * Homepage QR codes must really scan. Renders every decal the landing page
 * shows (same templates, same permanent demo codes) plus the big demo QR,
 * rasterizes them with sharp and decodes them with jsQR.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import jsQR from "jsqr";
import sharp from "sharp";

import { DESIGNER_TILES, FALLBACK_CODES, HERO_TEMPLATE, REVEAL_TEMPLATE, landingOrigin, type LandingBuildKey } from "../src/lib/landing-config";
import { qrSvg, scanUrl } from "../src/lib/qr/generate";
import { TEMPLATES, renderTagSvg } from "../src/lib/tag";
import type { TagData } from "../src/lib/tag/types";

const ORIGIN = "https://buildtags.app";

const BUILDS: Record<LandingBuildKey, Omit<TagData, "scanUrl">> = {
  car: { year: 2022, make: "Toyota", model: "GR Supra", trim: "3.0 Premium", nickname: "GHOST", powerLabel: "540 WHP", torqueLabel: "520 WTQ", modCount: 24, username: "buildtag_demo", socials: [{ public_id: "a", platform: "instagram", handle: "ghost_supra", source: "vehicle" }] },
  bagger: { year: 2020, make: "Harley-Davidson", model: "Street Glide", trim: "CVO", nickname: "DUSK", powerLabel: "118 WHP", torqueLabel: "128 WTQ", modCount: 10, username: "buildtag_demo", socials: [{ public_id: "b", platform: "instagram", handle: "dusk_glide", source: "vehicle" }] },
  sportbike: { year: 2021, make: "Ducati", model: "Panigale V2", trim: "955", nickname: "ROSSO", powerLabel: "148 WHP", torqueLabel: "72 WTQ", modCount: 20, username: "buildtag_demo", socials: [{ public_id: "c", platform: "instagram", handle: "rosso_v2", source: "vehicle" }] },
  shopBuild: { year: 2026, make: "Harley-Davidson", model: "Road Glide", trim: "", nickname: "NIGHTSHIFT", powerLabel: "", torqueLabel: "", modCount: 8, username: "nightshift_rider", socials: [] },
};

async function decode(svg: string, widthPx: number): Promise<string | null> {
  const { data, info } = await sharp(Buffer.from(svg), { density: 300 }).resize({ width: widthPx }).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

function decal(template: keyof typeof TEMPLATES, build: LandingBuildKey) {
  const url = scanUrl(ORIGIN, FALLBACK_CODES[build]);
  return { url, svg: renderTagSvg(TEMPLATES[template].build(), { ...BUILDS[build], scanUrl: url }, { idPrefix: "t", material: false }).svg };
}

describe("homepage QR origin", () => {
  it("encodes the live site from local and preview environments", () => {
    assert.equal(landingOrigin("http://localhost:3020"), ORIGIN);
    assert.equal(landingOrigin("https://buildtag-abc.vercel.app"), ORIGIN);
    assert.equal(landingOrigin("https://buildtags.app/"), ORIGIN);
  });
});

describe("homepage QR codes decode", () => {
  it("the big live-demo QR", async () => {
    const url = scanUrl(ORIGIN, FALLBACK_CODES.car);
    assert.equal(await decode(qrSvg(url, 300), 300), url);
  });

  const cases: [string, keyof typeof TEMPLATES, LandingBuildKey][] = [
    ["hero", HERO_TEMPLATE, "car"],
    ["reveal", REVEAL_TEMPLATE, "sportbike"],
    ...DESIGNER_TILES.map((t) => [`designer ${t.name}`, t.template, t.build] as [string, keyof typeof TEMPLATES, LandingBuildKey]),
  ];
  for (const [name, template, build] of cases) {
    it(`${name}: ${template} on ${BUILDS[build].nickname}`, async () => {
      const { url, svg } = decal(template, build);
      assert.equal(await decode(svg, 600), url);
    });
  }
});

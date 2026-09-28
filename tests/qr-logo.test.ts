/**
 * QR center logos must never break scanning. Renders the BuildTag word and
 * the car wordmark at the largest allowed size, rasterizes at the same
 * sizes the designer's decoder gate uses, and decodes with jsQR.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import jsQR from "jsqr";
import sharp from "sharp";

import { createQrMatrix } from "../src/lib/qr/generate";
import { LOGO_MAX_SCALE, renderQr } from "../src/lib/qr/render";
import { WORD_PATH, WORD_VIEWBOX } from "../src/lib/tag/word-path";

const URL = "https://buildtags.app/s/GHS7K2P9";

async function decode(svg: string, px: number): Promise<string | null> {
  const { data, info } = await sharp(Buffer.from(svg)).resize(px, px).flatten({ background: "#fff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height)?.data ?? null;
}

describe("QR center logo", () => {
  it("word path is a sane, NaN-free outline", () => {
    assert.ok(WORD_VIEWBOX.width > 0 && WORD_VIEWBOX.height > 0);
    assert.doesNotMatch(WORD_PATH, /NaN/);
    assert.ok(WORD_PATH.length > 1000);
  });

  for (const kind of ["buildtag-word", "buildtag"] as const) {
    it(`${kind} at max size still decodes at 600, 1000 and 1600 px`, async () => {
      const qr = renderQr(createQrMatrix(URL), {
        x: 0,
        y: 0,
        size: 1000,
        moduleStyle: "classic",
        finderStyle: "classic",
        dark: "#000",
        light: "#fff",
        logo: { kind, url: null, scale: LOGO_MAX_SCALE },
      });
      assert.ok(qr.logoBox, "logo box present");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">${qr.svg}</svg>`;
      for (const px of [600, 1000, 1600]) {
        assert.equal(await decode(svg, px), URL, `${kind} @ ${px}px`);
      }
    });
  }
});

/**
 * QR reliability matrix: renders every template × shape × style × frame
 * combination through the exact export pipeline, rasterizes the SVG with
 * sharp at a modest print-like resolution and decodes it with jsQR.
 *
 *   pnpm qr:validate
 *
 * Any combination whose decode does not equal the scan URL is reported and
 * the process exits 1. Designs the app would refuse to export (blocking
 * static checks) are skipped and counted separately.
 */
import jsQR from "jsqr";
import sharp from "sharp";

import { FRAME_LIST, SHAPE_LIST, STYLE_LIST, TEMPLATE_LIST, overallStatus, renderTagSvg, runDesignChecks } from "../src/lib/tag";
import type { TagConfig, TagData } from "../src/lib/tag/types";

const data: TagData = {
  scanUrl: "https://buildtag.example/s/GHS7K2P9",
  year: 2022,
  make: "Toyota",
  model: "GR Supra",
  nickname: "GHOST",
  powerLabel: "612 WHP",
  socialHandle: "@ghost_supra",
};

async function decode(svg: string, widthPx: number): Promise<string | null> {
  const { data: pixels, info } = await sharp(Buffer.from(svg), { density: 300 })
    .resize({ width: widthPx })
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const result = jsQR(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.length), info.width, info.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

async function main() {
  let tested = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const template of TEMPLATE_LIST) {
    for (const shape of SHAPE_LIST) {
      for (const style of STYLE_LIST) {
        for (const frame of FRAME_LIST) {
          const config: TagConfig = { ...template.build(), shape: shape.id, style: style.id, colors: { ...style.colors }, frame: frame.id };
          const { svg, layout } = renderTagSvg(config, data, { physical: true });
          const status = overallStatus(runDesignChecks(config, layout));
          if (status === "block") {
            skipped++;
            continue;
          }
          tested++;
          const decoded = await decode(svg, 900);
          if (decoded !== data.scanUrl) {
            failures.push(`${template.id}/${shape.id}/${style.id}/${frame.id} -> ${decoded ?? "no decode"}`);
          }
        }
      }
    }
  }

  console.log(`tested ${tested} combinations, skipped ${skipped} that the app blocks, ${failures.length} failed`);
  for (const f of failures) console.log("FAIL", f);
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

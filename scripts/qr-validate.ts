/**
 * QR reliability matrix. Renders designs through the exact export pipeline,
 * rasterizes with sharp and decodes with jsQR at two sizes.
 *
 *   pnpm qr:validate
 *
 * Matrix: every template × shape × frame (template defaults for QR style),
 * plus every module style × finder style (three shapes), plus center-logo
 * variants. Combinations the safety engine marks INVALID are skipped
 * (the app blocks them). Any decodable-by-heuristics design that fails
 * the decoder makes the process exit 1.
 */
import jsQR from "jsqr";
import sharp from "sharp";

import { evaluateQrSafety } from "../src/lib/qr/safety";
import { QR_FINDER_STYLES, QR_MODULE_STYLES } from "../src/lib/qr/render";
import { FRAME_LIST, SHAPE_LIST, TEMPLATE_LIST, moduleSizeMm, renderTagSvg } from "../src/lib/tag";
import type { TagConfig, TagData } from "../src/lib/tag/types";

const data: TagData = {
  scanUrl: "https://buildtag.vercel.app/s/GHS7K2P9",
  year: 2022,
  make: "Toyota",
  model: "GR Supra",
  trim: "3.0 Premium",
  nickname: "GHOST",
  powerLabel: "612 WHP",
  torqueLabel: "574 WTQ",
  modCount: 24,
  username: "buildtag_demo",
  socials: [{ public_id: "x", platform: "instagram", handle: "ghost_supra", source: "vehicle" }],
};

async function decode(svg: string, widthPx: number): Promise<string | null> {
  const { data: pixels, info } = await sharp(Buffer.from(svg), { density: 300 }).resize({ width: widthPx }).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const result = jsQR(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.length), info.width, info.height, { inversionAttempts: "attemptBoth" });
  return result?.data ?? null;
}

async function test(label: string, config: TagConfig, counters: { tested: number; skipped: number; failures: string[] }) {
  const { svg, layout, logoCoverage } = renderTagSvg(config, data, { mode: "export", physical: true, material: false });
  const safety = evaluateQrSafety({
    qrDark: config.colors.qrDark,
    qrLight: config.colors.qrLight,
    moduleMm: moduleSizeMm(config, layout),
    minModuleMm: 0.5,
    logoCoverage,
    quietZoneModules: 4,
    qrSqueezed: layout.qrSqueezed,
    imageBackground: config.background.kind === "image",
    frameOutsideBlock: true,
    hasQr: layout.qr !== null,
  });
  if (safety.quality === "invalid") {
    counters.skipped++;
    return;
  }
  counters.tested++;
  for (const w of [700, 1300]) {
    const decoded = await decode(svg, w);
    if (decoded !== data.scanUrl) {
      counters.failures.push(`${label} @${w}px -> ${decoded ?? "no decode"}`);
      return;
    }
  }
}

async function main() {
  const counters = { tested: 0, skipped: 0, failures: [] as string[] };

  for (const t of TEMPLATE_LIST) {
    for (const shape of SHAPE_LIST) {
      for (const frame of FRAME_LIST) {
        await test(`${t.id}/${shape.id}/${frame.id}`, { ...t.build(), shape: shape.id, frame: frame.id }, counters);
      }
    }
  }

  const baseCfg = TEMPLATE_LIST[0].build();
  for (const m of QR_MODULE_STYLES) {
    for (const f of QR_FINDER_STYLES) {
      for (const shape of ["rounded", "circle", "wide"] as const) {
        await test(`qr/${m.id}/${f.id}/${shape}`, { ...baseCfg, shape, qr: { ...baseCfg.qr, moduleStyle: m.id, finderStyle: f.id } }, counters);
      }
      await test(`qr-logo/${m.id}/${f.id}`, { ...baseCfg, qr: { ...baseCfg.qr, moduleStyle: m.id, finderStyle: f.id, logo: { kind: "buildtag", url: null, scale: 0.24 } } }, counters);
    }
  }

  console.log(`tested ${counters.tested} designs, skipped ${counters.skipped} the app blocks, ${counters.failures.length} failed`);
  for (const f of counters.failures) console.log("FAIL", f);
  process.exit(counters.failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

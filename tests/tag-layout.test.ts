/**
 * Print-fit invariants for the Designer layout engine. Run with `pnpm test`.
 * The exhaustive check (every template x layout x shape x size x font x frame,
 * measured against the real font outlines and rasterized safe areas) is
 * `pnpm tag:fit`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LAYOUT_LIST, SHAPE_LIST, SIZE_PRESETS, TEMPLATE_LIST, layoutTag, sizeFromPreset, toInches } from "../src/lib/tag";
import { SAFE_MARGIN_IN } from "../src/lib/tag/layout";
import { lineInk, printable } from "../src/lib/tag/measure";
import type { TagData } from "../src/lib/tag/types";

const data: TagData = {
  scanUrl: "https://buildtags.app/s/GHS7K2P9",
  year: 2024,
  make: "Mercedes-Benz AMG Performance Division Special Vehicle Ops",
  model: "GT Black Series Track Package Carbon Aero Edition Limited 1of1",
  trim: "Performance Edition",
  nickname: "MIDNIGHT EXPRESS STREET MACHINE PROJECT",
  powerLabel: "1,250 WHP",
  torqueLabel: "1,100 WTQ",
  modCount: 148,
  username: "midnight_express_builds_2024",
  socials: [{ public_id: "x", platform: "instagram", handle: "midnight.express.street.machine", source: "vehicle" }],
};

describe("tag layout stays inside the print-safe area", () => {
  it("keeps every element inside the content box, and the box inside the safe margin", () => {
    for (const t of TEMPLATE_LIST) {
      for (const layout of LAYOUT_LIST) {
        for (const shape of SHAPE_LIST) {
          for (const preset of SIZE_PRESETS) {
            const cfg = { ...t.build(), layout: layout.id, shape: shape.id, size: sizeFromPreset(preset.id) };
            const l = layoutTag(cfg, data);
            const c = l.contentRect;
            const safe = SAFE_MARGIN_IN * (l.width / toInches(cfg.size).width);
            const label = `${t.id}/${layout.id}/${shape.id}/${preset.id}`;
            assert.ok(c.x >= safe - 0.01 && c.y >= safe - 0.01 && c.x + c.w <= l.width - safe + 0.01 && c.y + c.h <= l.height - safe + 0.01, `${label}: content box inside safe margin`);
            const inBox = (x0: number, y0: number, x1: number, y1: number, what: string) =>
              assert.ok(x0 >= c.x - 0.5 && y0 >= c.y - 0.5 && x1 <= c.x + c.w + 0.5 && y1 <= c.y + c.h + 0.5, `${label}: ${what} inside content box`);
            if (l.qr) inBox(l.qr.frameX, l.qr.frameY, l.qr.frameX + l.qr.frameSize, l.qr.frameY + l.qr.frameSize, "QR block");
            if (l.logoBox) inBox(l.logoBox.x, l.logoBox.y, l.logoBox.x + l.logoBox.w, l.logoBox.y + l.logoBox.h, "logo");
            for (const line of l.lines) {
              const ink = lineInk(line);
              inBox(line.x + ink.x0, line.y - ink.top, line.x + ink.x1, line.y + ink.bottom, `"${line.text}"`);
            }
          }
        }
      }
    }
  });

  it("reports text that had to shrink below the printable minimum instead of hiding it", () => {
    const cfg = { ...TEMPLATE_LIST[0].build(), size: { id: "custom" as const, width: 1.5, height: 1.5, unit: "in" as const } };
    const full = { ...cfg, text: { ...cfg.text, custom: "STAGE 3 · E85 · BUILT NOT BOUGHT", fields: { ...cfg.text.fields, year: true, make: true, model: true, trim: true, nickname: true, power: true, torque: true, social: true, username: true } } };
    assert.ok(layoutTag(full, data).tinyText.length > 0);
  });
});

describe("printable text", () => {
  it("drops characters the font can't draw instead of printing empty boxes", () => {
    assert.equal(printable("condensed", "STAGE 2 🔥 E85 →"), "STAGE 2 E85");
    assert.equal(printable("condensed", "@GHOST_SUPRA · 612 WHP"), "@GHOST_SUPRA · 612 WHP");
  });
});

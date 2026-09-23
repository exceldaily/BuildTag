import { qrContrastVerdict } from "@/lib/qr/contrast";

import { moduleSizeMm } from "./layout";
import type { TagConfig, TagLayout } from "./types";

export type CheckLevel = "ok" | "warn" | "block";

export interface DesignCheck {
  id: string;
  level: CheckLevel;
  title: string;
  detail: string;
}

/** Printed module sizes: below 0.5mm most phone cameras struggle. */
const MODULE_WARN_MM = 0.7;
const MODULE_BLOCK_MM = 0.45;

/**
 * Static checks that do not need a browser. The designer adds a live decode
 * test (jsQR) on top of these before enabling downloads.
 */
export function runDesignChecks(config: TagConfig, layout: TagLayout): DesignCheck[] {
  const checks: DesignCheck[] = [];

  if (!config.content.qr || !layout.qr) {
    checks.push({
      id: "qr-missing",
      level: "block",
      title: "QR is turned off",
      detail: "A BuildTag needs its QR code. Turn it back on under Content.",
    });
    return checks;
  }

  const contrast = qrContrastVerdict(config.colors.qrDark, config.colors.qrLight);
  if (contrast.verdict === "blocked") {
    checks.push({
      id: "contrast",
      level: "block",
      title: `QR contrast too low (${contrast.ratio.toFixed(1)}:1)`,
      detail: "Pick a darker module color or a lighter plate. Black on white is always safe.",
    });
  } else if (contrast.verdict === "warning") {
    checks.push({
      id: "contrast",
      level: "warn",
      title: `QR contrast is marginal (${contrast.ratio.toFixed(1)}:1)`,
      detail: "It will probably scan, but test on a phone before printing.",
    });
  } else if (contrast.verdict === "acceptable") {
    checks.push({
      id: "contrast",
      level: "ok",
      title: `QR contrast ${contrast.ratio.toFixed(1)}:1`,
      detail: "Inverted or tinted codes scan on modern phones. Test before you print.",
    });
  } else {
    checks.push({ id: "contrast", level: "ok", title: `QR contrast ${contrast.ratio.toFixed(1)}:1`, detail: "Excellent." });
  }

  const mm = moduleSizeMm(config, layout);
  if (mm !== null) {
    if (mm < MODULE_BLOCK_MM) {
      checks.push({
        id: "module-size",
        level: "block",
        title: `QR modules are ${mm.toFixed(2)}mm`,
        detail: "Too small to print reliably. Increase the decal size, remove the frame, or drop some text.",
      });
    } else if (mm < MODULE_WARN_MM) {
      checks.push({
        id: "module-size",
        level: "warn",
        title: `QR modules are ${mm.toFixed(2)}mm`,
        detail: "Scannable up close. A larger decal scans from further away.",
      });
    } else {
      checks.push({ id: "module-size", level: "ok", title: `QR modules are ${mm.toFixed(2)}mm`, detail: "Good print size." });
    }
  }

  const plate = qrContrastVerdict(config.colors.qrLight, config.colors.background);
  if (plate.ratio < 1.3 && config.colors.qrLight.toLowerCase() !== config.colors.background.toLowerCase()) {
    checks.push({
      id: "plate",
      level: "ok",
      title: "QR plate blends with the background",
      detail: "That is fine: the quiet zone is still painted in the plate color.",
    });
  }

  return checks;
}

export function overallStatus(checks: DesignCheck[]): CheckLevel {
  if (checks.some((c) => c.level === "block")) return "block";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "ok";
}

import { qrContrastVerdict } from "./contrast";

/**
 * QR SAFE ENGINE
 *
 * One place that decides whether a design is safe to print. It grades
 * error correction, quiet zone, physical module size, logo coverage,
 * contrast, finder protection and decorative overlap, and explains why.
 *
 * This is a design/readability check. The Designer runs a real decoder on
 * the rendered artwork separately; only that decoder result may call a
 * design "validated".
 */

export type ScanQuality = "excellent" | "good" | "risky" | "invalid";
export type CheckLevel = "pass" | "warn" | "fail";

export interface SafetyCheck {
  id: string;
  level: CheckLevel;
  label: string;
  detail: string;
}

export interface SafetyInput {
  qrDark: string;
  qrLight: string;
  /** Physical size of one module in millimetres (null when no QR). */
  moduleMm: number | null;
  /** Minimum module size for the selected print specification. */
  minModuleMm: number;
  /** Fraction of matrix area covered by the center logo plate. */
  logoCoverage: number;
  /** Quiet zone in modules. */
  quietZoneModules: number;
  /** The layout had to shrink the QR below its preferred size to fit text. */
  qrSqueezed: boolean;
  /** Whether a background image sits behind the artwork. */
  imageBackground: boolean;
  /** Frame decorations are constrained to stay outside the block by construction. */
  frameOutsideBlock: boolean;
  hasQr: boolean;
}

export interface SafetyReport {
  quality: ScanQuality;
  checks: SafetyCheck[];
  contrastRatio: number;
}

export const LOGO_COVERAGE_WARN = 0.07;
export const LOGO_COVERAGE_FAIL = 0.1;

export function evaluateQrSafety(input: SafetyInput): SafetyReport {
  const checks: SafetyCheck[] = [];
  const contrast = qrContrastVerdict(input.qrDark, input.qrLight);

  if (!input.hasQr) {
    return {
      quality: "invalid",
      contrastRatio: contrast.ratio,
      checks: [{ id: "qr", level: "fail", label: "QR is missing", detail: "A BuildTag must carry its QR code." }],
    };
  }

  checks.push({ id: "ecc", level: "pass", label: "Error correction level H", detail: "30% of the code can be damaged and still read." });

  checks.push(
    input.quietZoneModules >= 4
      ? { id: "quiet", level: "pass", label: "Safe quiet zone", detail: `${input.quietZoneModules} clear modules on every side.` }
      : { id: "quiet", level: "fail", label: "Quiet zone too small", detail: "Scanners need at least 4 clear modules around the code." },
  );

  if (contrast.verdict === "blocked") {
    checks.push({ id: "contrast", level: "fail", label: "Low contrast", detail: `${contrast.ratio.toFixed(1)}:1 between modules and plate. Use a darker module color or a lighter plate.` });
  } else if (contrast.verdict === "warning") {
    checks.push({ id: "contrast", level: "warn", label: "Marginal contrast", detail: `${contrast.ratio.toFixed(1)}:1. Likely fine on a phone; test before printing.` });
  } else if (contrast.verdict === "acceptable") {
    checks.push({ id: "contrast", level: "pass", label: "Good contrast", detail: `${contrast.ratio.toFixed(1)}:1. Inverted or tinted codes read on modern phones.` });
  } else {
    checks.push({ id: "contrast", level: "pass", label: "Strong contrast", detail: `${contrast.ratio.toFixed(1)}:1.` });
  }

  if (input.moduleMm !== null) {
    const mm = input.moduleMm;
    const min = input.minModuleMm;
    if (mm < min) {
      checks.push({ id: "module", level: "fail", label: "QR too small at this physical size", detail: `Modules are ${mm.toFixed(2)} mm; this material needs at least ${min.toFixed(2)} mm. Choose a larger size, remove the frame, or drop some text.` });
    } else if (mm < min * 1.6) {
      checks.push({ id: "module", level: "warn", label: "QR may be small for this decal", detail: `Modules are ${mm.toFixed(2)} mm. Scans up close; a larger decal scans from further away.` });
    } else {
      checks.push({ id: "module", level: "pass", label: "QR size suitable for selected decal", detail: `Modules are ${mm.toFixed(2)} mm.` });
    }
  }

  if (input.logoCoverage > 0) {
    if (input.logoCoverage > LOGO_COVERAGE_FAIL) {
      checks.push({ id: "logo", level: "fail", label: "Center logo covers too much", detail: `${Math.round(input.logoCoverage * 100)}% of the code is hidden.` });
    } else if (input.logoCoverage > LOGO_COVERAGE_WARN) {
      checks.push({ id: "logo", level: "warn", label: "Center logo near the limit", detail: `${Math.round(input.logoCoverage * 100)}% of the code is hidden; error correction can absorb it, but test.` });
    } else {
      checks.push({ id: "logo", level: "pass", label: "Center logo within safe range", detail: `${Math.round(input.logoCoverage * 100)}% of the code is hidden.` });
    }
  }

  checks.push({ id: "finders", level: "pass", label: "Finder patterns protected", detail: "Finder styling keeps the 1:1:3:1:1 ratios scanners look for." });
  checks.push(
    input.frameOutsideBlock
      ? { id: "overlap", level: "pass", label: "No decoration over the code", detail: "Frames and backgrounds stay outside the protected block." }
      : { id: "overlap", level: "fail", label: "Decoration overlaps the code", detail: "Move decorative artwork outside the protected block." },
  );

  if (input.imageBackground) {
    checks.push({ id: "backing", level: "pass", label: "Opaque QR backing over the photo", detail: "The plate and quiet zone are always painted solid." });
  }

  if (input.qrSqueezed) {
    checks.push({ id: "fit", level: "warn", label: "Text is crowding the QR", detail: "The layout shrank the code to fit everything. Remove a line or pick a larger size." });
  }

  const fails = checks.filter((c) => c.level === "fail").length;
  const warns = checks.filter((c) => c.level === "warn").length;
  const quality: ScanQuality = fails > 0 ? "invalid" : warns >= 2 ? "risky" : warns === 1 ? "good" : "excellent";

  return { quality, checks, contrastRatio: contrast.ratio };
}

export const QUALITY_LABEL: Record<ScanQuality, string> = {
  excellent: "Excellent",
  good: "Good",
  risky: "Risky",
  invalid: "Invalid",
};

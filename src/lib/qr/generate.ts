import QRCode from "qrcode";

/**
 * QR geometry helpers shared by the public build page, the designer, and
 * exports. The matrix comes from the `qrcode` library (ISO 18004 compliant).
 *
 * Reliability rules (never relaxed by design code):
 *   - error correction level H (30% recovery) for printed decals
 *   - a quiet zone of >= 4 modules on every side
 *   - modules are rendered as one solid path (no gaps, no rounded modules)
 */

export const QR_QUIET_ZONE_MODULES = 4;
export const QR_ERROR_CORRECTION = "H" as const;

export interface QrMatrix {
  size: number;
  /** Row-major bit array; 1 = dark module. */
  data: Uint8Array;
  version: number;
}

export function createQrMatrix(text: string): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: QR_ERROR_CORRECTION });
  return {
    size: qr.modules.size,
    data: qr.modules.data as Uint8Array,
    version: qr.version,
  };
}

/**
 * Builds a single SVG path (in module units, origin at top-left of the
 * matrix) covering every dark module. Horizontal runs are merged so the path
 * stays small and prints without hairline seams.
 */
export function qrModulesPath(matrix: QrMatrix): string {
  const { size, data } = matrix;
  const parts: string[] = [];
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (data[y * size + x]) {
        let run = 1;
        while (x + run < size && data[y * size + x + run]) run++;
        parts.push(`M${x} ${y}h${run}v1h-${run}z`);
        x += run;
      } else {
        x++;
      }
    }
  }
  return parts.join("");
}

/** Scan URL encoded in every BuildTag: short, uppercase, permanent. */
export function scanUrl(siteOrigin: string, code: string): string {
  return `${siteOrigin.replace(/\/+$/, "")}/s/${code.toUpperCase()}`;
}

/**
 * Standalone QR SVG (used on the public build page and the QR test screen).
 * `sizePx` is the total rendered size including the quiet zone.
 */
export function qrSvg(text: string, sizePx = 240, fg = "#000000", bg = "#ffffff"): string {
  const matrix = createQrMatrix(text);
  const total = matrix.size + QR_QUIET_ZONE_MODULES * 2;
  const path = qrModulesPath(matrix);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="BuildTag QR code">`,
    `<rect width="${total}" height="${total}" fill="${bg}"/>`,
    `<path transform="translate(${QR_QUIET_ZONE_MODULES} ${QR_QUIET_ZONE_MODULES})" d="${path}" fill="${fg}"/>`,
    `</svg>`,
  ].join("");
}

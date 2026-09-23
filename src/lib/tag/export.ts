"use client";

import jsQR from "jsqr";

/**
 * Browser-side export + validation helpers for the designer.
 * Rasterization happens on a canvas from the exact SVG that gets downloaded.
 */

export const PRINT_DPI = 300;

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not rasterize the decal preview."));
    img.src = svgToDataUrl(svg);
  });
}

export async function rasterizeSvg(
  svg: string,
  widthPx: number,
  heightPx: number,
  background: string | null,
): Promise<HTMLCanvasElement> {
  const img = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthPx);
  canvas.height = Math.round(heightPx);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed."))), "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface DecodeResult {
  ok: boolean;
  decoded: string | null;
  expected: string;
}

/**
 * Programmatic scan test: rasterize the exact export at a modest size and
 * decode it with jsQR. A pass here plus a real phone test is the "READY TO
 * PRINT" bar.
 */
export async function decodeQrFromSvg(svg: string, widthPx: number, heightPx: number, expected: string): Promise<DecodeResult> {
  try {
    const canvas = await rasterizeSvg(svg, widthPx, heightPx, "#FFFFFF");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, decoded: null, expected };
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result =
      jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" }) ?? null;
    const decoded = result?.data ?? null;
    return { ok: decoded === expected, decoded, expected };
  } catch {
    return { ok: false, decoded: null, expected };
  }
}

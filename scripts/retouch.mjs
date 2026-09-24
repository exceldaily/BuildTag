/**
 * Photo retouching for demo images: removes third-party decals by filling the
 * masked area from the surrounding paint (harmonic fill, solved with SOR),
 * then restores the photo's grain so the patch does not look smooth.
 *
 * Used by scripts/fetch-images.mjs. Coordinates are for the 2000px-wide
 * source the fetch script downloads.
 */
import sharp from "sharp";

/** GHOST (ghost-1): "M Performance" stripes and lettering on the right side of the hood. */
export const GHOST1_STICKER = {
  window: { x: 1350, y: 1195, w: 270, h: 160 },
  // Outline in source pixels, a few px outside the stripes and letters.
  polygon: [
    [1378, 1290], [1404, 1280], [1498, 1236], [1515, 1229], [1548, 1226], [1588, 1233], [1594, 1247],
    [1566, 1268], [1460, 1316], [1435, 1334], [1422, 1335], [1378, 1308],
  ],
  // Clean paint right below the decal, used to measure the photo's grain.
  grainSample: { x: 1450, y: 1345, w: 70, h: 24 },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {Buffer} input image (any format sharp reads)
 * @param {typeof GHOST1_STICKER} spec
 * @returns {Promise<Buffer>} PNG buffer, same size
 */
export async function removeDecal(input, spec) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, channels } = info;
  const { x: X0, y: Y0, w: W, h: H } = spec.window;

  // Rasterize the outline (slightly dilated by the blur + low threshold).
  const pts = spec.polygon.map(([x, y]) => `${x - X0},${y - Y0}`).join(" ");
  const maskRaw = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}"/><polygon points="${pts}" fill="#fff"/></svg>`))
    .blur(1.2)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = maskRaw[i] > 16 ? 1 : 0;
  // Keep a 1px frame fixed so the solve always has a boundary.
  for (let x = 0; x < W; x++) mask[x] = mask[(H - 1) * W + x] = 0;
  for (let y = 0; y < H; y++) mask[y * W] = mask[y * W + W - 1] = 0;

  // Grain: high-frequency residual of a clean patch.
  const g = spec.grainSample;
  let sum = 0;
  let n = 0;
  for (let y = g.y + 1; y < g.y + g.h - 1; y++) {
    for (let x = g.x + 1; x < g.x + g.w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const at = (yy, xx) => data[(yy * width + xx) * channels + c];
        const local = (at(y - 1, x) + at(y + 1, x) + at(y, x - 1) + at(y, x + 1)) / 4;
        const r = at(y, x) - local;
        sum += r * r;
        n++;
      }
    }
  }
  const grain = Math.sqrt(sum / n) * 0.8;
  const rand = mulberry32(20260924);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());

  const out = Buffer.from(data);
  for (let c = 0; c < 3; c++) {
    const f = new Float32Array(W * H);
    let bsum = 0;
    let bn = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = data[((Y0 + y) * width + (X0 + x)) * channels + c];
        f[y * W + x] = v;
        if (!mask[y * W + x]) {
          bsum += v;
          bn++;
        }
      }
    }
    const start = bsum / bn;
    for (let i = 0; i < W * H; i++) if (mask[i]) f[i] = start;
    // Harmonic fill: successive over-relaxation.
    const omega = 1.92;
    for (let it = 0; it < 1500; it++) {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (!mask[i]) continue;
          const avg = (f[i - 1] + f[i + 1] + f[i - W] + f[i + W]) / 4;
          f[i] += omega * (avg - f[i]);
        }
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!mask[i]) continue;
        out[((Y0 + y) * width + (X0 + x)) * channels + c] = Math.max(0, Math.min(255, Math.round(f[i])));
      }
    }
  }
  // Same luminance grain on all channels inside the patch.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      const d = gauss() * grain;
      for (let c = 0; c < 3; c++) {
        const k = ((Y0 + y) * width + (X0 + x)) * channels + c;
        out[k] = Math.max(0, Math.min(255, Math.round(out[k] + d)));
      }
    }
  }
  return sharp(out, { raw: { width, height: info.height, channels } }).png().toBuffer();
}

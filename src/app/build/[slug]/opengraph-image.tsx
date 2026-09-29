import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import { anonClient } from "@/lib/db/public";
import { photoUrl } from "@/lib/storage";
import type { PublicBuildResult } from "@/lib/types";
import { formatCount, vehicleTitle } from "@/lib/utils";

/**
 * Link preview for a build: the owner's hero photo with the build's name,
 * power and mod count, in the BuildTags look. Rendered with the anonymous
 * client only, so a private build can never end up in a preview image.
 */
export const runtime = "nodejs";
export const alt = "BuildTags build sheet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const BG = "#06050d";
const PINK = "#ff2d7a";
const CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

const assetCache = new Map<string, Promise<ArrayBuffer>>();
function asset(url: string): Promise<ArrayBuffer> {
  let p = assetCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.arrayBuffer();
    });
    p.catch(() => assetCache.delete(url));
    assetCache.set(url, p);
  }
  return p;
}

/** The static default preview, used whenever a build can't be shown. */
async function fallback(origin: string): Promise<Response> {
  const jpg = await asset(`${origin}/og.jpg`);
  return new Response(jpg, { headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE } });
}

interface Card {
  photoUri: string;
  logoUri: string;
  title: string;
  name: string;
  nameSize: number;
  stats: [string, string][];
  fonts: { bold: ArrayBuffer; italic: ArrayBuffer; mono: ArrayBuffer };
}

/** Everything the card needs, or null when the build can't be shown (private, missing, no photo, fetch error). */
async function loadCard(slug: string, origin: string): Promise<Card | null> {
  try {
    const { data } = await anonClient().rpc("get_public_build", { p_slug: slug.toLowerCase().slice(0, 80), p_visitor_key: null });
    const result = (data ?? { access: "not_found" }) as PublicBuildResult;
    if (result.access !== "ok") return null;
    const b = result.build;

    const src = b.hero_image_url ?? (b.photos[0] ? photoUrl(b.photos[0].storage_path, "full") : null);
    if (!src) return null;

    // Satori can't read WebP, so the photo is cropped and re-encoded here.
    const raw = await fetch(src.startsWith("/") ? `${origin}${src}` : src).then((r) => {
      if (!r.ok) throw new Error(`photo ${r.status}`);
      return r.arrayBuffer();
    });
    const photo = await sharp(Buffer.from(raw)).resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();

    const [bold, italic, mono, logo] = await Promise.all([
      asset(`${origin}/fonts/BarlowCondensed-Bold.ttf`),
      asset(`${origin}/fonts/BarlowCondensed-SemiBoldItalic.ttf`),
      asset(`${origin}/fonts/ShareTechMono-Regular.ttf`),
      asset(`${origin}/brand/logo-white.svg`),
    ]);

    const name = (b.nickname || b.model || "").toUpperCase();
    const stats: [string, string][] = [];
    if (b.horsepower) stats.push([formatCount(b.horsepower), b.horsepower_type]);
    if (b.torque) stats.push([formatCount(b.torque), b.horsepower_type === "WHP" ? "WTQ" : "TQ"]);
    if (b.mod_count > 0) stats.push([formatCount(b.mod_count), b.mod_count === 1 ? "MOD" : "MODS"]);

    return {
      photoUri: `data:image/jpeg;base64,${photo.toString("base64")}`,
      logoUri: `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`,
      title: [vehicleTitle(b), b.trim].filter(Boolean).join(" ").toUpperCase(),
      name,
      nameSize: name.length > 14 ? 96 : name.length > 9 ? 124 : 156,
      stats,
      fonts: { bold, italic, mono },
    };
  } catch (err) {
    console.error("build og image failed", slug, err);
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "buildtags.app";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;

  const card = await loadCard(slug, origin);
  if (!card) return fallback(origin);
  const { photoUri, logoUri, title, name, nameSize, stats, fonts } = card;

  // Rendered as PNG by the image engine, then re-encoded: chat apps skip previews much over 300 KB.
  const rendered = new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", backgroundColor: BG, fontFamily: "Barlow" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={photoUri} width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", backgroundImage: "linear-gradient(to top, rgba(6,5,13,0.97) 0%, rgba(6,5,13,0.78) 34%, rgba(6,5,13,0.12) 66%, rgba(6,5,13,0.5) 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", backgroundImage: "linear-gradient(to right, rgba(6,5,13,0.7) 0%, rgba(6,5,13,0) 55%)" }} />

        {/* brand + frame corner */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logoUri} width={230} height={67} style={{ position: "absolute", top: 50, left: 64 }} />
        <div style={{ position: "absolute", top: 44, right: 44, width: 36, height: 36, display: "flex", borderTop: `2px solid ${PINK}`, borderRight: `2px solid ${PINK}` }} />

        <div style={{ position: "absolute", left: 64, right: 64, bottom: 52, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 19, letterSpacing: 3.4, color: PINK }}>BUILD SHEET / SCAN THE BUILD</div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 34, letterSpacing: 2.4, color: "rgba(255,255,255,0.82)" }}>{title}</div>
          <div style={{ display: "flex", marginTop: 2, fontFamily: "BarlowItalic", fontSize: nameSize, lineHeight: 0.95, color: "#ffffff" }}>{name}</div>

          <div style={{ display: "flex", marginTop: 22, alignItems: "flex-end", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.28)", paddingTop: 18 }}>
            <div style={{ display: "flex" }}>
              {stats.map(([v, l], i) => (
                <div key={l} style={{ display: "flex", flexDirection: "column", marginRight: 46, paddingLeft: i === 0 ? 0 : 46, borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.2)" }}>
                  <div style={{ display: "flex", fontFamily: "BarlowItalic", fontSize: 62, lineHeight: 1, color: "#ffffff" }}>{v}</div>
                  <div style={{ display: "flex", marginTop: 6, fontFamily: "Mono", fontSize: 17, letterSpacing: 3, color: "rgba(255,255,255,0.7)" }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 19, letterSpacing: 3.4, color: "rgba(255,255,255,0.85)" }}>BUILDTAGS.APP</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Barlow", data: fonts.bold, weight: 700, style: "normal" },
        { name: "BarlowItalic", data: fonts.italic, weight: 600, style: "italic" },
        { name: "Mono", data: fonts.mono, weight: 400, style: "normal" },
      ],
    },
  );
  try {
    const jpg = await sharp(Buffer.from(await rendered.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": CACHE } });
  } catch (err) {
    console.error("build og image encode failed", slug, err);
    return fallback(origin);
  }
}

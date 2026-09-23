import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import { serverEnv } from "@/lib/server-env";

const VISITOR_COOKIE = "bt_vid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Anonymous, non-reversible visitor key used for likes and report
 * rate-limiting. It combines a first-party random cookie with a coarse
 * network fingerprint, HMAC'd with a server secret. No IP or user agent is
 * ever stored.
 */
export async function getVisitorKey(options: { create?: boolean } = {}): Promise<string | null> {
  const cookieStore = await cookies();
  let vid = cookieStore.get(VISITOR_COOKIE)?.value ?? null;

  if (!vid && options.create) {
    vid = randomBytes(16).toString("base64url");
    try {
      cookieStore.set(VISITOR_COOKIE, vid, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    } catch {
      // Server Components cannot set cookies; route handlers can.
    }
  }

  if (!vid) return null;
  return hashVisitor(vid, await coarseNetworkKey());
}

async function coarseNetworkKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
  // /24 for IPv4, /48 for IPv6: enough to slow down cookie-clearing abuse
  // without being identifying.
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":");
  return ip.split(".").slice(0, 3).join(".");
}

function hashVisitor(vid: string, network: string): string {
  return createHmac("sha256", serverEnv().BUILDTAG_VISITOR_SECRET)
    .update(`${vid}|${network}`)
    .digest("base64url")
    .slice(0, 43);
}

/** Pure network key (no cookie) for per-IP throttles. */
export async function getNetworkKey(): Promise<string> {
  const network = await coarseNetworkKey();
  return createHmac("sha256", serverEnv().BUILDTAG_VISITOR_SECRET).update(`net|${network}`).digest("base64url");
}

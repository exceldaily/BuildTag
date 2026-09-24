import type { ClaimError } from "@/lib/types";

/** Customer-facing claim failure copy. */
export const CLAIM_ERROR_MESSAGE: Record<ClaimError, string> = {
  invalid: "That claim link or code doesn't match a build. Check it and try again, or ask the shop for a new one.",
  expired: "This claim link has expired. Ask the shop that set up your build to send a new one.",
  revoked: "This claim link was replaced or cancelled. Ask the shop for the latest one.",
  claimed: "This build has already been claimed.",
  issuer_member:
    "You're on the team of the business that created this build, so you can't claim it. The customer claims it from their own account.",
  rate_limited: "Too many attempts. Wait a bit and try again.",
  unconfirmed: "Please confirm you are authorized to claim this build.",
};

/** Private claim URL. The raw token only exists in this URL and on the printed card. */
export function claimUrl(base: string, token: string) {
  return `${base.replace(/\/$/, "")}/claim/${token}`;
}

/** Loose client-side check for a typed code: BT-XXXX-XXXX, dashes and case optional. */
export function looksLikeClaimCode(input: string) {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // mirrors buildtag.normalize_claim_code()
  return (s.length === 10 && s.startsWith("BT") ? s.slice(2) : s).length === 8;
}

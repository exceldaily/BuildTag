import { siteUrl } from "@/lib/env";

/** The shareable page behind a crew invite code. */
export function crewInviteUrl(code: string): string {
  return `${siteUrl().replace(/\/+$/, "")}/crew-invite/${code}`;
}

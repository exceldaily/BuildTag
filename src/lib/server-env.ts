import "server-only";

import { z } from "zod";

/**
 * Server-only environment. Nothing here is ever imported by a client
 * component (the `server-only` import makes that a build error).
 */
const serverSchema = z.object({
  /** Secret used to HMAC anonymous visitor keys for likes/reports. */
  BUILDTAG_VISITOR_SECRET: z.string().min(16),
  /** Comma-separated emails that receive the admin UI shortcut. Authorization
   *  itself is the buildtag.admins table; this only controls the nav link. */
  ADMIN_EMAILS: z.string().default(""),
  /** Optional. Only used by scripts (RLS tests, demo seeding). Never by the app. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  /** Future billing. Presence does not enable checkout. */
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse({
    BUILDTAG_VISITOR_SECRET: process.env.BUILDTAG_VISITOR_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `BuildTag is missing server environment variables: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}.`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function adminEmails(): string[] {
  return serverEnv()
    .ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

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
  /** Stripe. The secret key turns on decal checkout; the two prices turn on Pro. */
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  /** Shared secret between the Stripe webhook route and the billing_* database functions. */
  BUILDTAG_INTERNAL_TOKEN: z.string().optional(),
  /** Transactional email (Resend). Missing values disable sending; orders never fail because of email. */
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  ORDER_NOTIFICATION_EMAIL: z.string().optional(),
  /** Reserved: automatic manufacturer submission. Keep false while orders are reviewed by hand. */
  AUTO_SUBMIT_TO_FULFILLMENT: z.enum(["true", "false"]).default("false"),
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
    STRIPE_PRICE_PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || undefined,
    BUILDTAG_INTERNAL_TOKEN: process.env.BUILDTAG_INTERNAL_TOKEN || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    FROM_EMAIL: process.env.FROM_EMAIL || undefined,
    ORDER_NOTIFICATION_EMAIL: process.env.ORDER_NOTIFICATION_EMAIL || undefined,
    AUTO_SUBMIT_TO_FULFILLMENT: process.env.AUTO_SUBMIT_TO_FULFILLMENT === "true" ? "true" : "false",
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

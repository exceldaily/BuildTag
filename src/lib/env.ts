import { z } from "zod";

/**
 * Public environment (safe in the browser bundle). Both values are public by
 * definition: the publishable key only ever maps to the `anon` role, which has
 * zero table privileges in the buildtag schema.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3020"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cachedPublic: PublicEnv | null = null;

export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `BuildTag is missing public environment variables: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

/** Absolute site origin without a trailing slash. */
export function siteUrl(): string {
  return publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}

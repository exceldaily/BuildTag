import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { publicEnv } from "@/lib/env";
import type { Database, ProfileRow } from "@/lib/types";

export type BuildTagClient = SupabaseClient<Database, "buildtag">;

/**
 * Request-scoped Supabase client carrying the signed-in user's session (or
 * the anon role when signed out). RLS applies to everything it does. BuildTag
 * has no service-role client in the application at all.
 */
export async function createServerSupabaseClient(): Promise<BuildTagClient> {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database, "buildtag">(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "buildtag" },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
              });
            }
          } catch {
            // Server Components cannot set cookies; the proxy refreshes the
            // session instead (documented @supabase/ssr contract).
          }
        },
      },
    },
  );
}

export interface AuthContext {
  user: User;
  client: BuildTagClient;
}

/** Returns the verified user or null. Uses getUser(), never getSession(). */
export async function getOptionalUser(): Promise<AuthContext | null> {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  return { user, client };
}

/** Loads the authenticated user or redirects to sign-in. */
export async function requireUser(nextPath?: string): Promise<AuthContext> {
  const ctx = await getOptionalUser();
  if (!ctx) {
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    redirect(target);
  }
  return ctx;
}

export interface ProfileContext extends AuthContext {
  profile: ProfileRow;
  isAdmin: boolean;
}

/** Authenticated user + their BuildTag profile (created on first visit). */
export async function requireProfile(nextPath?: string): Promise<ProfileContext> {
  const ctx = await requireUser(nextPath);
  const [{ data: profile, error }, { data: isAdmin }, { data: status }] = await Promise.all([
    ctx.client.rpc("ensure_profile"),
    ctx.client.rpc("is_admin"),
    ctx.client.rpc("my_account_status"),
  ]);
  // A banned account's access token can outlive the ban by up to an hour; stop it here (0020).
  if ((status as { banned?: boolean } | null)?.banned) redirect("/auth/banned");
  if (error || !profile) {
    throw new Error(`Could not load profile: ${error?.message ?? "unknown error"}`);
  }
  return { ...ctx, profile: profile as ProfileRow, isAdmin: Boolean(isAdmin) };
}

/** Authenticated admin or redirect. Authorization is the admins table, not the UI. */
export async function requireAdmin(): Promise<ProfileContext> {
  const ctx = await requireProfile("/admin");
  if (!ctx.isAdmin) {
    redirect("/dashboard?error=forbidden");
  }
  return ctx;
}

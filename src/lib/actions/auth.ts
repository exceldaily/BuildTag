"use server";

import { redirect } from "next/navigation";

import { setLocaleCookie } from "@/lib/i18n/server";

import { siteUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject, type ActionResult } from "@/lib/validation/common";
import { loginSchema, signupSchema } from "@/lib/validation/profile";

function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function signUpAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const client = await createServerSupabaseClient();
  const wantsPro = form.get("plan") === "pro";
  // A claim link (or other deep link) that sent the visitor here wins.
  const landing = form.get("next") ? safeNext(form.get("next")) : wantsPro ? "/dashboard/profile?plan=pro" : "/dashboard?welcome=1";

  const { data: available } = await client.rpc("username_available", { p_username: parsed.data.username });
  if (available === false) {
    return { ok: false, error: "That username is taken.", fieldErrors: { username: "Already taken" } };
  }

  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(landing)}`,
      data: { username: parsed.data.username, display_name: parsed.data.display_name, locale: parsed.data.locale, region: parsed.data.region, app: "buildtag" },
    },
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  // Supabase returns a user with no identities (and sends no email) when the
  // address already has an account. Say so instead of promising an email.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      ok: false,
      error: "An account with this email already exists. Sign in instead, or use Forgot password to reset it.",
    };
  }

  await setLocaleCookie(parsed.data.locale);

  // Email confirmation on: no session yet.
  if (!data.session) {
    redirect(`/login?check_email=1&email=${encodeURIComponent(parsed.data.email)}`);
  }
  redirect(landing);
}

export async function signInAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, error: "Wrong email or password." };
  }
  // Follow the account's saved language from the first page after sign-in.
  const { data: prof } = await client.rpc("ensure_profile");
  const savedLocale = (prof as { locale?: string } | null)?.locale;
  if (savedLocale === "en" || savedLocale === "fr" || savedLocale === "de" || savedLocale === "es" || savedLocale === "th") {
    await setLocaleCookie(savedLocale);
  }

  redirect(safeNext(form.get("next")));
}

export async function signOutAction(): Promise<void> {
  const client = await createServerSupabaseClient();
  await client.auth.signOut();
  redirect("/");
}

export async function sendPasswordResetAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Enter your email." };
  const client = await createServerSupabaseClient();
  await client.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/dashboard/profile` });
  return { ok: true, data: undefined };
}

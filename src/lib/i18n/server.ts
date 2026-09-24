import "server-only";

import { cookies, headers } from "next/headers";

import { LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./index";

/**
 * Locale for the current request: the cookie set at sign-up / on the
 * profile page wins, then the browser's Accept-Language, then English.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  return localeFromAcceptLanguage(h.get("accept-language"));
}

/** Persist the language choice for a year (server actions / route handlers only). */
export async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
}

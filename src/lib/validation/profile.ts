import { z } from "zod";

import { optionalUrl, trimmed, usernameSchema } from "./common";

export const localeSchema = z.enum(["en", "fr", "de", "es", "th"]).default("en");
export const regionSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,8}$/, "Pick a region")
  .default("US");

export const profileSchema = z.object({
  username: usernameSchema,
  display_name: z.string().trim().min(1, "Display name is required").max(60),
  bio: trimmed(600),
  location_text: trimmed(80),
  website_url: optionalUrl,
  locale: localeSchema,
  region: regionSchema,
});

export const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72),
  username: usernameSchema,
  display_name: z.string().trim().min(1).max(60),
  locale: localeSchema,
  region: regionSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const reportSchema = z.object({
  slug: z.string().trim().min(3).max(80),
  reason: z.enum(["spam", "inappropriate", "copyright", "impersonation", "other"]),
  description: trimmed(1000),
});

export const tagDesignSchema = z.object({
  name: z.string().trim().min(1).max(60),
  template: z.string().trim().min(1).max(40),
  shape: z.string().trim().min(1).max(40),
  style: z.string().trim().min(1).max(40),
  configuration_json: z.record(z.string(), z.unknown()),
});

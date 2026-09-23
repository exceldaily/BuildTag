import { z } from "zod";

/** Only http(s) URLs are ever stored or rendered as links. */
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    try {
      const u = new URL(value);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full URL starting with https://");

export const optionalUrl = z
  .union([z.literal(""), safeUrl])
  .optional()
  .transform((v) => (v ? v : null));

export const optionalInt = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(min).max(max)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

export const optionalMoney = z
  .union([z.literal(""), z.coerce.number().min(0).max(99_999_999)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : Math.round(v * 100) / 100));

export const trimmed = (max: number) => z.string().trim().max(max).default("");

export const checkbox = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const uuid = z.string().uuid();

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "3 to 30 characters: letters, numbers, underscores");

/** Turns a FormData into a plain object (repeated keys become the last value). */
export function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    out[key] = typeof value === "string" ? value : undefined;
  }
  return out;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

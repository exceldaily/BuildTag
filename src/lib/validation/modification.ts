import { z } from "zod";

import { checkbox, optionalMoney, optionalUrl, trimmed } from "./common";

export const MOD_CATEGORY_VALUES = [
  "engine",
  "forced_induction",
  "intake",
  "exhaust",
  "fuel_system",
  "cooling",
  "ecu_tuning",
  "transmission",
  "drivetrain",
  "suspension",
  "brakes",
  "wheels",
  "tires",
  "exterior",
  "interior",
  "lighting",
  "audio",
  "electronics",
  "safety",
  "weight_reduction",
  "aero",
  "other",
] as const;

export const modificationSchema = z.object({
  category: z.enum(MOD_CATEGORY_VALUES),
  part_name: z.string().trim().min(1, "Part name is required").max(120),
  brand: trimmed(80),
  part_number: trimmed(80),
  description: trimmed(1000),
  price: optionalMoney,
  price_public: checkbox,
  product_url: optionalUrl,
  affiliate_url: optionalUrl,
  merchant: trimmed(80),
  affiliate_network: trimmed(80),
  installed_by_text: trimmed(120),
  installed_by_organization_id: z
    .union([z.literal(""), z.string().uuid()])
    .optional()
    .transform((v) => (v ? v : null)),
  part_id: z
    .union([z.literal(""), z.string().uuid()])
    .optional()
    .transform((v) => (v ? v : null)),
  installation_date: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional()
    .transform((v) => (v ? v : null)),
  /** Private work order / invoice ref. Kept only on business records (the database clears it for owner entries). */
  work_order_reference: trimmed(80),
});

export type ModificationInput = z.infer<typeof modificationSchema>;

/** Quick-add: category + part name (+ optional brand) only. */
export const quickModSchema = z.object({
  category: z.enum(MOD_CATEGORY_VALUES),
  part_name: z.string().trim().min(1).max(120),
  brand: trimmed(80),
});

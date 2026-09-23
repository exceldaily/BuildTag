import { z } from "zod";

import { checkbox, optionalInt, optionalMoney, trimmed } from "./common";

const currentYear = new Date().getFullYear();

export const vehicleBasicsSchema = z.object({
  year: optionalInt(1900, currentYear + 2),
  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(60),
  trim: trimmed(60),
  nickname: trimmed(40),
});

export const vehicleOverviewSchema = vehicleBasicsSchema.extend({
  description: trimmed(3000),
  location_text: trimmed(80),
});

export const vehiclePerformanceSchema = z.object({
  horsepower: optionalInt(0, 10000),
  horsepower_type: z.enum(["HP", "WHP"]).default("WHP"),
  torque: optionalInt(0, 20000),
  torque_unit: z.enum(["LB_FT", "NM"]).default("LB_FT"),
  mileage: optionalInt(0, 5_000_000),
  mileage_unit: z.enum(["MI", "KM"]).default("MI"),
  build_started_year: optionalInt(1900, currentYear + 2),
  dyno_type: trimmed(60),
});

export const vehicleCostSchema = z.object({
  build_cost: optionalMoney,
  build_cost_public: checkbox,
});

export const vehicleSettingsSchema = z.object({
  visibility: z.enum(["public", "unlisted", "private"]),
  show_owner_section: checkbox,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes")
    .min(3)
    .max(80),
});

export type VehicleBasicsInput = z.infer<typeof vehicleBasicsSchema>;

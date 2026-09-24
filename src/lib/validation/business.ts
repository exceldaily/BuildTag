import { z } from "zod";

import { checkbox, optionalUrl, trimmed } from "./common";
import { vehicleOverviewSchema } from "./vehicle";

export const ORGANIZATION_TYPE_VALUES = [
  "dealership",
  "custom_shop",
  "performance_shop",
  "motorcycle_shop",
  "installer",
  "tuner",
  "manufacturer",
  "dealer_group",
  "other",
] as const;

const optionalEmail = z
  .union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email").max(200)])
  .optional()
  .transform((v) => v ?? "");

const country = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Two-letter country code, e.g. US or TH")
  .default("US");

export const organizationRegisterSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name").max(80),
  organization_type: z.enum(ORGANIZATION_TYPE_VALUES),
  website_url: optionalUrl,
  phone: trimmed(40),
  email: optionalEmail,
  city: trimmed(80),
  region: trimmed(80),
  country,
});

export const organizationProfileSchema = organizationRegisterSchema.extend({
  tagline: trimmed(140),
  description: trimmed(1000),
  location_text: trimmed(80),
  address_line1: trimmed(200),
  postal_code: trimmed(20),
  instagram_handle: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v.replace(/^@/, "") || null : null)),
  logo_url: optionalUrl,
});

export const RELATIONSHIP_ROLE_VALUES = ["builder", "dealer", "installer", "tuner", "sponsor"] as const;

export const orgVehicleSchema = vehicleOverviewSchema.extend({
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  customer_name: trimmed(120),
  customer_email: optionalEmail,
  customer_phone: trimmed(40),
  notes: trimmed(2000),
  add_to_crew: checkbox,
});

export const customerRecordSchema = z.object({
  customer_name: trimmed(120),
  customer_email: optionalEmail,
  customer_phone: trimmed(40),
  notes: trimmed(2000),
});

export const claimOptionsSchema = z.object({
  expires_in_days: z.coerce.number().int().min(1).max(365).default(60),
  recipient_email: optionalEmail,
});

export const orgCrewSchema = z.object({
  name: z.string().trim().min(2, "Name the community").max(40),
  tagline: trimmed(140),
  kind: z.enum(["shop", "dealership", "brand", "customer", "riding"]).default("shop"),
});

export const BUSINESS_INTEREST_VALUES = [
  "customer_buildtags",
  "customer_claiming",
  "shop_profile",
  "crews",
  "bulk_buildtags",
  "analytics",
  "custom_branding",
  "api_integration",
  "dealer_group",
  "oem_partnership",
] as const;

export const BUSINESS_INTEREST_LABEL: Record<(typeof BUSINESS_INTEREST_VALUES)[number], string> = {
  customer_buildtags: "BuildTags for customer builds",
  customer_claiming: "Customer claiming / handoff",
  shop_profile: "Shop profile page",
  crews: "Shop or dealership crew",
  bulk_buildtags: "Bulk BuildTag ordering",
  analytics: "Analytics",
  custom_branding: "Custom branding",
  api_integration: "API / DMS integration",
  dealer_group: "Multi-location / dealer group",
  oem_partnership: "OEM / brand partnership",
};

export const INQUIRY_BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "dealership", label: "Dealership" },
  { value: "performance_shop", label: "Performance shop" },
  { value: "custom_shop", label: "Custom shop" },
  { value: "motorcycle_shop", label: "Motorcycle shop" },
  { value: "tuner", label: "Tuner" },
  { value: "installer", label: "Installer" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "dealer_group", label: "Dealer group" },
  { value: "other", label: "Other" },
];

export const INQUIRY_INDUSTRIES = [
  { value: "automotive", label: "Automotive" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "off_road", label: "Off-road / powersports" },
  { value: "other", label: "Other" },
] as const;

export const businessInquirySchema = z.object({
  name: z.string().trim().min(1, "Your name").max(120),
  business_name: z.string().trim().min(1, "Business name").max(160),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  phone: trimmed(40),
  website: z
    .string()
    .trim()
    .max(300)
    .default("")
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v)),
  business_type: z.enum(["dealership", "performance_shop", "custom_shop", "motorcycle_shop", "tuner", "installer", "manufacturer", "dealer_group", "other"]),
  industry: z.enum(["", "automotive", "motorcycle", "off_road", "other"]).default(""),
  location_count: trimmed(20),
  builds_per_month: trimmed(20),
  interests: z.array(z.enum(BUSINESS_INTEREST_VALUES)).max(10).default([]),
  message: trimmed(4000),
  /** Honeypot: real people never fill it. */
  company_fax: z.string().max(200).optional().default(""),
});

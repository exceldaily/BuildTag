import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats an integer with thousands separators ("1,284"). */
export function formatCount(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(n ?? 0)));
}

/** Formats a currency amount in whole dollars ("$26,420"). */
export function formatMoney(n: number | null | undefined, currency = "USD"): string {
  if (n === null || n === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Vehicle display title: "2022 Toyota GR Supra". */
export function vehicleTitle(v: { year: number | null; make: string; model: string }): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ");
}

/** Power label like "450 WHP" or "" when unset. */
export function powerLabel(
  hp: number | null | undefined,
  type: "HP" | "WHP" | null | undefined,
): string {
  if (!hp) return "";
  return `${formatCount(hp)} ${type ?? "HP"}`;
}

/** Torque label like "400 WTQ" / "400 LB-FT" / "540 NM". */
export function torqueLabel(
  torque: number | null | undefined,
  unit: "LB_FT" | "NM" | null | undefined,
  hpType: "HP" | "WHP" | null | undefined,
): string {
  if (!torque) return "";
  if (unit === "NM") return `${formatCount(torque)} NM`;
  return `${formatCount(torque)} ${hpType === "WHP" ? "WTQ" : "LB-FT"}`;
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

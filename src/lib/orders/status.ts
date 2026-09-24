import type { OrderRow, OrderStatus } from "@/lib/types";

/**
 * Order state machine + presentation helpers shared by the customer pages,
 * the admin production queue and the tests. The database enforces the same
 * transitions in admin_set_order_status(); this file is the readable source
 * of truth for the UI.
 */

export const TERMINAL: OrderStatus[] = ["cancelled", "refunded", "delivered"];

/** Admin transitions allowed from each status (server enforces the same). */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  payment_processing: ["paid", "awaiting_payment", "cancelled"],
  paid: ["needs_review", "artwork_approved", "artwork_issue", "cancelled", "refunded"],
  needs_review: ["artwork_approved", "artwork_issue", "cancelled", "refunded"],
  artwork_approved: ["sent_to_maker", "in_production", "artwork_issue", "production_error", "cancelled", "refunded"],
  artwork_issue: ["artwork_approved", "needs_review", "cancelled", "refunded"],
  preparing_artwork: ["artwork_approved", "artwork_issue", "sent_to_maker", "cancelled", "refunded"],
  submitted_to_printer: ["sent_to_maker", "in_production", "shipped", "production_error", "cancelled", "refunded"],
  sent_to_maker: ["in_production", "shipped", "production_error", "cancelled", "refunded"],
  in_production: ["shipped", "production_error", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
  production_error: ["artwork_approved", "sent_to_maker", "in_production", "cancelled", "refunded"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from !== to && (TRANSITIONS[from] ?? []).includes(to);
}

/** Admin-facing labels (production language). */
export const ADMIN_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting payment",
  payment_processing: "Payment processing",
  paid: "Paid",
  needs_review: "Needs review",
  artwork_approved: "Artwork approved",
  artwork_issue: "Artwork issue",
  preparing_artwork: "Preparing artwork",
  submitted_to_printer: "Sent to maker",
  sent_to_maker: "Sent to maker",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  production_error: "Production issue",
};

/** Customer-facing labels: no internal language. */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Not placed yet",
  awaiting_payment: "Waiting for payment",
  payment_processing: "Confirming payment",
  paid: "Payment confirmed",
  needs_review: "In production review",
  artwork_approved: "Approved for production",
  artwork_issue: "We need to check something",
  preparing_artwork: "Approved for production",
  submitted_to_printer: "In production",
  sent_to_maker: "In production",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  production_error: "Sorting out a production issue",
};

/** Customer timeline steps and which statuses count as reaching each step. */
export const CUSTOMER_STEPS: { key: string; label: string; reached: OrderStatus[] }[] = [
  { key: "placed", label: "Order placed", reached: ["awaiting_payment", "payment_processing", "paid", "needs_review", "artwork_approved", "artwork_issue", "preparing_artwork", "submitted_to_printer", "sent_to_maker", "in_production", "shipped", "delivered"] },
  { key: "paid", label: "Payment confirmed", reached: ["paid", "needs_review", "artwork_approved", "artwork_issue", "preparing_artwork", "submitted_to_printer", "sent_to_maker", "in_production", "shipped", "delivered"] },
  { key: "review", label: "Production review", reached: ["artwork_approved", "preparing_artwork", "submitted_to_printer", "sent_to_maker", "in_production", "shipped", "delivered"] },
  { key: "production", label: "In production", reached: ["submitted_to_printer", "sent_to_maker", "in_production", "shipped", "delivered"] },
  { key: "shipped", label: "Shipped", reached: ["shipped", "delivered"] },
  { key: "delivered", label: "Delivered", reached: ["delivered"] },
];

export function customerStepState(status: OrderStatus): { key: string; label: string; done: boolean }[] {
  return CUSTOMER_STEPS.map((s) => ({ key: s.key, label: s.label, done: s.reached.includes(status) }));
}

/** Badge tone per status (admin + customer). */
export const STATUS_TONE: Record<OrderStatus, string> = {
  draft: "border-line text-muted-foreground",
  awaiting_payment: "border-neon-amber/60 text-neon-amber",
  payment_processing: "border-neon-amber/60 text-neon-amber",
  paid: "border-neon-cyan/60 text-neon-cyan",
  needs_review: "border-signal/60 text-signal",
  artwork_approved: "border-neon-cyan/60 text-neon-cyan",
  artwork_issue: "border-neon-amber/70 text-neon-amber",
  preparing_artwork: "border-neon-cyan/60 text-neon-cyan",
  submitted_to_printer: "border-neon-purple/70 text-[#c4b5fd]",
  sent_to_maker: "border-neon-purple/70 text-[#c4b5fd]",
  in_production: "border-neon-purple/70 text-[#c4b5fd]",
  shipped: "border-emerald-500/60 text-emerald-400",
  delivered: "border-emerald-500/60 text-emerald-400",
  cancelled: "border-line text-muted-foreground",
  refunded: "border-line text-muted-foreground",
  production_error: "border-destructive/60 text-destructive",
};

/** Reasons an admin can attach to an artwork issue. */
export const ARTWORK_ISSUE_REASONS = ["QR readability concern", "Uploaded logo too low resolution", "Text too close to cut line", "Invalid artwork", "Customer typo", "Other"] as const;

/** Clean file names for anything an admin downloads. */
export function productionFileName(orderNumber: string, kind: "production-svg" | "production-png" | "proof-png" | "production-sheet" | "package"): string {
  const base = orderNumber.replace(/[^A-Za-z0-9-]/g, "");
  switch (kind) {
    case "production-svg":
      return `${base}-production.svg`;
    case "production-png":
      return `${base}-production.png`;
    case "proof-png":
      return `${base}-proof.png`;
    case "production-sheet":
      return `${base}-production-sheet.html`;
    case "package":
      return `${base}-production-package.zip`;
  }
}

export const ORDER_NUMBER_PATTERN = /^BT-\d{6}$/;

export function formatMoneyCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function shippingLines(o: Pick<OrderRow, "shipping_name" | "shipping_line1" | "shipping_line2" | "shipping_city" | "shipping_state" | "shipping_postal_code" | "shipping_country"> & { shipping_company?: string | null }): string[] {
  return [o.shipping_name, o.shipping_company || "", o.shipping_line1, o.shipping_line2 || "", `${o.shipping_city}, ${o.shipping_state} ${o.shipping_postal_code}`.trim(), o.shipping_country].filter((l) => l && l.trim() !== ",");
}

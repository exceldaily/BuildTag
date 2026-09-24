"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { siteUrl } from "@/lib/env";
import { notifyArtworkIssue, notifyShipped, summaryFromJson } from "@/lib/orders/notify";
import { getPaymentProvider } from "@/lib/payments";
import { requireAdmin, requireProfile } from "@/lib/supabase/server";
import type { Json, OrderRow, OrderStatus } from "@/lib/types";
import { fieldErrors, formToObject, type ActionResult } from "@/lib/validation/common";

const shippingSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name").max(120),
  company: z.string().trim().max(120).default(""),
  line1: z.string().trim().min(3, "Enter a street address").max(200),
  line2: z.string().trim().max(200).default(""),
  city: z.string().trim().min(2, "Enter a city").max(120),
  state: z.string().trim().min(2, "Enter a state or region").max(80),
  postal_code: z.string().trim().min(3, "Enter a postal code").max(20),
  country: z.string().trim().length(2).default("US"),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().email(),
  notes: z.string().trim().max(1000).default(""),
});

const placeSchema = z.object({
  snapshot_id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(500),
  proof_approved: z.union([z.literal("on"), z.literal("true"), z.literal("1")], { message: "Approve the proof to continue." }),
});

/**
 * Places an order from an approved production snapshot. Prices, availability,
 * validation and the proof-approval requirement are all enforced by
 * buildtag.place_order(); this only shapes the input.
 */
export async function placeOrderAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const raw = formToObject(form);
  const parsedShip = shippingSchema.safeParse(raw);
  const parsedPlace = placeSchema.safeParse(raw);
  if (!parsedShip.success || !parsedPlace.success) {
    const fe = { ...(parsedShip.success ? {} : fieldErrors(parsedShip.error)), ...(parsedPlace.success ? {} : fieldErrors(parsedPlace.error)) };
    return { ok: false, error: fe.proof_approved ? "Tick the box to approve your BuildTag for production." : "Check the highlighted fields.", fieldErrors: fe };
  }
  const { client } = await requireProfile();
  const { data: orderId, error } = await client.rpc("place_order", {
    p_snapshot_id: parsedPlace.data.snapshot_id,
    p_quantity: parsedPlace.data.quantity,
    p_shipping: parsedShip.data as unknown as Json,
    p_proof_approved: true,
  });
  if (error || !orderId) return { ok: false, error: friendly(error?.message ?? "Could not place the order.") };
  revalidatePath("/dashboard/orders");
  redirect(`/dashboard/orders/${orderId}`);
}

function friendly(message: string): string {
  if (message.includes("not available")) return "That material is preview-only right now. Pick Standard Gloss or Matte to order.";
  if (message.includes("failed validation")) return "This artwork failed the scan test. Fix the design and approve it again.";
  if (message.includes("already has an order")) return "This proof already has an order. Open it from your orders.";
  return message;
}

/** Starts payment through the configured provider, or explains that none is configured. */
export async function startCheckoutAction(orderId: string): Promise<ActionResult<{ url: string } | null>> {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const { client } = await requireProfile();
  const { data: order } = await client.from("orders").select("*").eq("id", parsed.data).maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  const o = order as OrderRow;
  if (o.status !== "awaiting_payment" && o.status !== "payment_processing") return { ok: false, error: "This order is not awaiting payment." };
  if (o.payment_status === "paid") return { ok: false, error: "This order is already paid." };

  const provider = getPaymentProvider();
  if (!provider.enabled) return { ok: true, data: null };

  const base = siteUrl();
  const session = await provider.createCheckout(o, {
    successUrl: `${base}/dashboard/orders/${o.id}?paid=1`,
    cancelUrl: `${base}/dashboard/orders/${o.id}`,
  });
  // "Processing" is a customer-visible hint only; PAID comes from the webhook.
  const { error } = await client.rpc("order_mark_payment_processing", { p_order_id: o.id, p_reference: session.reference });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { url: session.url } };
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const { client } = await requireProfile();
  const { error } = await client.rpc("customer_cancel_order", { p_order_id: parsed.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${parsed.data}`);
  return { ok: true, data: undefined };
}

/* ---------------------------------------------------------------------------
 * Admin
 * ------------------------------------------------------------------------- */

const ADMIN_STATUSES = ["paid", "needs_review", "artwork_approved", "artwork_issue", "sent_to_maker", "in_production", "shipped", "delivered", "cancelled", "refunded", "production_error"] as const;

const adminStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ADMIN_STATUSES),
  note: z.string().trim().max(1000).default(""),
  reason: z.string().trim().max(200).default(""),
  trackingNumber: z.string().trim().max(120).default(""),
  trackingUrl: z.union([z.literal(""), z.string().url().max(500)]).default(""),
  carrier: z.string().trim().max(60).default(""),
  providerOrderId: z.string().trim().max(120).default(""),
});

export async function adminSetOrderStatusAction(input: {
  orderId: string;
  status: OrderStatus;
  note?: string;
  reason?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  providerOrderId?: string;
}): Promise<ActionResult> {
  const parsed = adminStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireAdmin();
  const d = parsed.data;
  const { error } = await client.rpc("admin_set_order_status", {
    p_order_id: d.orderId,
    p_status: d.status,
    p_note: d.note,
    p_tracking_number: d.trackingNumber || null,
    p_tracking_url: d.trackingUrl || null,
    p_provider_order_id: d.providerOrderId || null,
    p_carrier: d.carrier || null,
    p_reason: d.reason || null,
  });
  if (error) return { ok: false, error: error.message };

  // Customer-facing notifications for the transitions that matter. Best effort.
  if (d.status === "shipped" || d.status === "artwork_issue") {
    const { data: summaryJson } = await client.rpc("admin_order_summary", { p_order_id: d.orderId });
    const summary = summaryFromJson(summaryJson);
    if (summary) {
      if (d.status === "shipped") await notifyShipped(client, null, summary);
      else await notifyArtworkIssue(client, null, summary, d.reason);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${d.orderId}`);
  revalidatePath(`/dashboard/orders/${d.orderId}`);
  revalidatePath("/dashboard/orders");
  return { ok: true, data: undefined };
}

export async function adminSetOrderNotesAction(orderId: string, notes: string): Promise<ActionResult> {
  const parsed = z.object({ orderId: z.string().uuid(), notes: z.string().max(4000) }).safeParse({ orderId, notes });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { client } = await requireAdmin();
  const { error } = await client.rpc("admin_set_order_notes", { p_order_id: parsed.data.orderId, p_notes: parsed.data.notes });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true, data: undefined };
}

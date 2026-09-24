import "server-only";

import { adminArtworkIssueEmail, adminNewOrderEmail, adminNotificationAddress, customerArtworkIssueEmail, customerConfirmationEmail, customerShippedEmail, sendEmail, type EmailMessage, type OrderEmailSummary } from "@/lib/email";
import type { Database } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Operational notifications. Every send is logged in notification_events and
 * never throws: an email problem must not break a paid order.
 *
 * Two callers:
 *   - the Stripe webhook (no session): passes the billing token
 *   - admin server actions (session): token is null, is_admin() authorizes
 */

type Db = SupabaseClient<Database, "buildtag">;
export type NotificationType = "new_paid_order_admin" | "order_confirmation" | "order_shipped" | "artwork_issue_admin" | "artwork_issue_customer";

async function deliver(db: Db, token: string | null, orderId: string, type: NotificationType, msg: EmailMessage): Promise<void> {
  if (!msg.to) {
    await log(db, token, orderId, type, "", "none", null, "skipped", "No recipient configured");
    return;
  }
  const res = await sendEmail(msg);
  await log(db, token, orderId, type, msg.to, res.provider, res.messageId, res.ok ? "sent" : "failed", res.error);
}

async function log(db: Db, token: string | null, orderId: string, type: string, recipient: string, provider: string, messageId: string | null, status: "sent" | "failed" | "skipped", error: string | null) {
  try {
    await db.rpc("record_notification", {
      p_token: token,
      p_order_id: orderId,
      p_type: type,
      p_recipient: recipient,
      p_provider: provider,
      p_provider_message_id: messageId,
      p_status: status,
      p_error: error,
    });
  } catch {
    // logging must never throw either
  }
}

/** Paid order: admin alert + customer confirmation. */
export async function notifyOrderPaid(db: Db, token: string | null, summary: OrderEmailSummary): Promise<void> {
  try {
    await deliver(db, token, summary.order_id, "new_paid_order_admin", adminNewOrderEmail(summary));
  } catch {
    /* swallow */
  }
  try {
    await deliver(db, token, summary.order_id, "order_confirmation", customerConfirmationEmail(summary));
  } catch {
    /* swallow */
  }
}

export async function notifyShipped(db: Db, token: string | null, summary: OrderEmailSummary): Promise<void> {
  try {
    await deliver(db, token, summary.order_id, "order_shipped", customerShippedEmail(summary));
  } catch {
    /* swallow */
  }
}

export async function notifyArtworkIssue(db: Db, token: string | null, summary: OrderEmailSummary, reason: string): Promise<void> {
  try {
    if (adminNotificationAddress()) await deliver(db, token, summary.order_id, "artwork_issue_admin", adminArtworkIssueEmail(summary, reason));
  } catch {
    /* swallow */
  }
  try {
    await deliver(db, token, summary.order_id, "artwork_issue_customer", customerArtworkIssueEmail(summary));
  } catch {
    /* swallow */
  }
}

export function summaryFromJson(v: unknown): OrderEmailSummary | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  if (typeof s.order_id !== "string" || typeof s.order_number !== "string") return null;
  return {
    order_id: s.order_id,
    order_number: s.order_number,
    customer_name: String(s.customer_name ?? ""),
    customer_email: String(s.customer_email ?? ""),
    vehicle: String(s.vehicle ?? ""),
    product: String(s.product ?? ""),
    size: String(s.size ?? ""),
    material: String(s.material ?? ""),
    finish: String(s.finish ?? ""),
    quantity: Number(s.quantity ?? 1),
    total_cents: Number(s.total_cents ?? 0),
    currency: String(s.currency ?? "USD"),
    payment_status: String(s.payment_status ?? ""),
    status: String(s.status ?? ""),
    qr_status: String(s.qr_status ?? ""),
    tracking_number: (s.tracking_number as string | null) ?? null,
    tracking_url: (s.tracking_url as string | null) ?? null,
    carrier: (s.carrier as string | null) ?? null,
  };
}

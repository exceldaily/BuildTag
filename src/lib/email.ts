import "server-only";

import { siteUrl } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

/**
 * Transactional email through Resend's REST API (no SDK). Sending is never
 * allowed to break an order: every call resolves with a result, and the
 * caller records it in notification_events for retry.
 *
 * Env: RESEND_API_KEY, FROM_EMAIL (verified sender), ORDER_NOTIFICATION_EMAIL.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailResult {
  ok: boolean;
  provider: "resend" | "none";
  messageId: string | null;
  error: string | null;
}

export function emailConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.RESEND_API_KEY && env.FROM_EMAIL);
}

export function adminNotificationAddress(): string | null {
  return serverEnv().ORDER_NOTIFICATION_EMAIL ?? null;
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    return { ok: false, provider: "none", messageId: null, error: "Email is not configured (RESEND_API_KEY / FROM_EMAIL missing)." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, provider: "resend", messageId: null, error: json.message ?? `Resend responded ${res.status}` };
    return { ok: true, provider: "resend", messageId: json.id ?? null, error: null };
  } catch (err) {
    return { ok: false, provider: "resend", messageId: null, error: err instanceof Error ? err.message : "Email send failed" };
  }
}

/* ---------------------------------------------------------------------------
 * Templates. Plain, high-contrast HTML that survives every mail client.
 * ------------------------------------------------------------------------- */

export interface OrderEmailSummary {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  vehicle: string;
  product: string;
  size: string;
  material: string;
  finish: string;
  quantity: number;
  total_cents: number;
  currency: string;
  payment_status: string;
  status: string;
  qr_status: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  carrier?: string | null;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(cents / 100);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function shell(title: string, rows: [string, string][], cta: { label: string; href: string }, intro?: string): { html: string; text: string } {
  const rowsHtml = rows
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#9a9ab0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;width:150px">${esc(k)}</td><td style="padding:6px 0;color:#ffffff;font-size:15px">${esc(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#06050d;font-family:Inter,Arial,sans-serif;color:#fff">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <p style="margin:0 0 8px;color:#ff2d7a;font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:700">BuildTags</p>
  <h1 style="margin:0 0 16px;font-size:26px;line-height:1.1;text-transform:uppercase;letter-spacing:.02em">${esc(title)}</h1>
  ${intro ? `<p style="margin:0 0 20px;color:#d5d5e0;font-size:15px;line-height:1.5">${esc(intro)}</p>` : ""}
  <table style="border-collapse:collapse;width:100%;border-top:1px solid #23222e;border-bottom:1px solid #23222e;margin:0 0 24px">${rowsHtml}</table>
  <a href="${cta.href}" style="display:inline-block;background:#ff2d7a;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:14px 22px;border-radius:6px;font-size:13px">${esc(cta.label)}</a>
  <p style="margin:28px 0 0;color:#6f6f85;font-size:12px">buildtags.app · Scan the build.</p>
</div></body></html>`;
  const text = [title.toUpperCase(), "", intro ?? "", "", ...rows.map(([k, v]) => `${k}: ${v}`), "", `${cta.label}: ${cta.href}`].filter((l) => l !== undefined).join("\n");
  return { html, text };
}

export function adminNewOrderEmail(s: OrderEmailSummary): EmailMessage {
  const href = `${siteUrl()}/admin/orders/${s.order_id}`;
  const { html, text } = shell(
    "New BuildTags order",
    [
      ["Order", s.order_number],
      ["Customer", s.customer_name || s.customer_email],
      ["Vehicle", s.vehicle],
      ["Product", s.product],
      ["Size", s.size],
      ["Material", s.material],
      ["Finish", s.finish],
      ["Quantity", String(s.quantity)],
      ["Total", money(s.total_cents, s.currency)],
      ["Payment", s.payment_status.toUpperCase()],
      ["Production status", s.status.replace(/_/g, " ").toUpperCase()],
      ["QR", s.qr_status.toUpperCase()],
    ],
    { label: "View order", href },
  );
  return { to: adminNotificationAddress() ?? "", subject: `🔥 New BuildTags Order — ${s.order_number}`, html, text };
}

export function customerConfirmationEmail(s: OrderEmailSummary): EmailMessage {
  const href = `${siteUrl()}/dashboard/orders/${s.order_id}`;
  const { html, text } = shell(
    "Your BuildTag is in the works",
    [
      ["Order", s.order_number],
      ["Vehicle", s.vehicle],
      ["Product", s.product],
      ["Size", s.size],
      ["Quantity", String(s.quantity)],
      ["Order total", money(s.total_cents, s.currency)],
    ],
    { label: "View order", href },
    `We've received your order and your BuildTag is now being reviewed for production. We'll email you again when it ships.`,
  );
  return { to: s.customer_email, subject: `Your BuildTag is in the works — ${s.order_number}`, html, text };
}

export function customerShippedEmail(s: OrderEmailSummary): EmailMessage {
  const href = s.tracking_url || `${siteUrl()}/dashboard/orders/${s.order_id}`;
  const { html, text } = shell(
    "Your BuildTag has shipped",
    [
      ["Order", s.order_number],
      ["Carrier", s.carrier || "See tracking"],
      ["Tracking", s.tracking_number || "Not provided"],
      ["Quantity", String(s.quantity)],
    ],
    { label: s.tracking_url ? "Track package" : "View order", href },
    `Your BuildTag is on its way. Stick it on, get scanned, climb the leaderboard.`,
  );
  return { to: s.customer_email, subject: `Your BuildTag has shipped — ${s.order_number}`, html, text };
}

export function adminArtworkIssueEmail(s: OrderEmailSummary, reason: string): EmailMessage {
  const href = `${siteUrl()}/admin/orders/${s.order_id}`;
  const { html, text } = shell("Artwork issue flagged", [["Order", s.order_number], ["Customer", s.customer_name || s.customer_email], ["Reason", reason]], { label: "View order", href });
  return { to: adminNotificationAddress() ?? "", subject: `Artwork issue — ${s.order_number}`, html, text };
}

export function customerArtworkIssueEmail(s: OrderEmailSummary): EmailMessage {
  const href = `${siteUrl()}/dashboard/orders/${s.order_id}`;
  const { html, text } = shell(
    "Quick check on your BuildTag",
    [
      ["Order", s.order_number],
      ["Vehicle", s.vehicle],
    ],
    { label: "View order", href },
    `We spotted something on your BuildTag artwork that we want to get right before it prints. Nothing is charged twice and nothing is lost. We'll reach out with the details shortly.`,
  );
  return { to: s.customer_email, subject: `Quick check on your BuildTag — ${s.order_number}`, html, text };
}

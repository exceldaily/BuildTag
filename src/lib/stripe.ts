import "server-only";

import { serverEnv } from "@/lib/server-env";

/**
 * Minimal Stripe REST client. No SDK: the app only needs Checkout Sessions,
 * the Billing Portal, subscription reads and webhook signature checks.
 */

const API = "https://api.stripe.com/v1";

export interface StripeConfig {
  enabled: boolean;
  secret: string;
  webhookSecret: string;
  priceMonthly: string;
  priceYearly: string;
}

export function stripeConfig(): StripeConfig {
  const env = serverEnv();
  return {
    enabled: Boolean(env.STRIPE_SECRET_KEY),
    secret: env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "",
    priceMonthly: env.STRIPE_PRICE_PRO_MONTHLY ?? "",
    priceYearly: env.STRIPE_PRICE_PRO_YEARLY ?? "",
  };
}

/** True when Pro can actually be bought (key + both prices present). */
export function proCheckoutAvailable(): boolean {
  const c = stripeConfig();
  return c.enabled && Boolean(c.priceMonthly) && Boolean(c.priceYearly);
}

type Params = Record<string, string | number | boolean | undefined>;

export async function stripeRequest<T>(method: "GET" | "POST", path: string, params: Params = {}): Promise<T> {
  const { secret } = stripeConfig();
  if (!secret) throw new Error("Stripe is not configured.");
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) body.set(k, String(v));
  }
  const url = method === "GET" && body.size ? `${API}${path}?${body}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${path} failed (${res.status})`);
  return json;
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  mode: "payment" | "subscription" | "setup";
  client_reference_id: string | null;
  customer: string | null;
  customer_email: string | null;
  subscription: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  metadata: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";
  customer: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  metadata: Record<string, string>;
  items: { data: { price: { id: string; recurring: { interval: string } | null } }[] };
}

export async function createProCheckout(opts: { userId: string; email: string; interval: "month" | "year"; customerId: string | null; successUrl: string; cancelUrl: string }): Promise<StripeCheckoutSession> {
  const c = stripeConfig();
  const price = opts.interval === "year" ? c.priceYearly : c.priceMonthly;
  if (!price) throw new Error("Pro pricing is not configured.");
  return stripeRequest<StripeCheckoutSession>("POST", "/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": 1,
    client_reference_id: opts.userId,
    ...(opts.customerId ? { customer: opts.customerId } : { customer_email: opts.email }),
    "subscription_data[metadata][user_id]": opts.userId,
    "subscription_data[metadata][app]": "buildtag",
    "metadata[user_id]": opts.userId,
    "metadata[kind]": "pro",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
  return stripeRequest<{ url: string }>("POST", "/billing_portal/sessions", { customer: customerId, return_url: returnUrl });
}

export async function getSubscription(id: string): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>("GET", `/subscriptions/${id}`);
}

export async function getCheckoutSession(id: string): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>("GET", `/checkout/sessions/${id}`);
}

export { verifyStripeSignature } from "./stripe-signature";

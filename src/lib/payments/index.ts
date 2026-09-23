import "server-only";

import type { OrderRow } from "@/lib/types";

/**
 * Payment provider abstraction. Checkout is only offered when a provider is
 * configured; otherwise orders wait in `awaiting_payment` and an admin marks
 * them paid (invoice, cash at the meet, etc.). Stripe is wired as the first
 * provider and activates itself when STRIPE_SECRET_KEY is present.
 */

export interface CheckoutSession {
  url: string;
  reference: string;
}

export interface PaymentProvider {
  readonly key: string;
  readonly name: string;
  readonly enabled: boolean;
  createCheckout(order: OrderRow, options: { successUrl: string; cancelUrl: string }): Promise<CheckoutSession>;
}

class NoPaymentProvider implements PaymentProvider {
  readonly key = "none";
  readonly name = "Not configured";
  readonly enabled = false;
  async createCheckout(): Promise<CheckoutSession> {
    throw new Error("Payments are not configured.");
  }
}

class StripeProvider implements PaymentProvider {
  readonly key = "stripe";
  readonly name = "Stripe";
  readonly enabled: boolean;
  private readonly secret: string;

  constructor(secret: string | undefined) {
    this.secret = secret ?? "";
    this.enabled = Boolean(secret);
  }

  /** Creates a Checkout Session through Stripe's REST API (no SDK dependency). */
  async createCheckout(order: OrderRow, options: { successUrl: string; cancelUrl: string }): Promise<CheckoutSession> {
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", options.successUrl);
    body.set("cancel_url", options.cancelUrl);
    body.set("client_reference_id", order.id);
    if (order.customer_email) body.set("customer_email", order.customer_email);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", order.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(order.total_cents));
    body.set("line_items[0][price_data][product_data][name]", `BuildTag order ${order.order_number}`);
    body.set("metadata[order_id]", order.id);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !json.url || !json.id) throw new Error(json.error?.message ?? "Stripe checkout failed");
    return { url: json.url, reference: json.id };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const stripe = new StripeProvider(process.env.STRIPE_SECRET_KEY);
  return stripe.enabled ? stripe : new NoPaymentProvider();
}

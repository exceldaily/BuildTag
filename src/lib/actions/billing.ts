"use server";

import { z } from "zod";

import { siteUrl } from "@/lib/env";
import { createPortalSession, createProCheckout, proCheckoutAvailable } from "@/lib/stripe";
import { requireProfile } from "@/lib/supabase/server";
import type { SubscriptionRow } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

/** Starts a Stripe Checkout for Pro (monthly or yearly). */
export async function startProCheckoutAction(interval: "month" | "year"): Promise<ActionResult<{ url: string }>> {
  const parsed = z.enum(["month", "year"]).safeParse(interval);
  if (!parsed.success) return { ok: false, error: "Pick monthly or yearly." };
  if (!proCheckoutAvailable()) return { ok: false, error: "Billing is not switched on yet." };

  const { client, user } = await requireProfile("/dashboard/profile");
  const { data: sub } = await client.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
  const existing = sub as SubscriptionRow | null;
  if (existing && existing.plan === "pro" && (existing.status === "active" || existing.status === "trialing")) {
    return { ok: false, error: "You are already on Pro. Use Manage billing to change plans." };
  }

  const base = siteUrl();
  try {
    const session = await createProCheckout({
      userId: user.id,
      email: user.email ?? "",
      interval: parsed.data,
      customerId: existing?.provider_customer_id ?? null,
      successUrl: `${base}/dashboard/profile?upgraded=1`,
      cancelUrl: `${base}/dashboard/profile`,
    });
    if (session.customer) await client.rpc("billing_remember_customer", { p_customer_id: session.customer });
    if (!session.url) return { ok: false, error: "Stripe did not return a checkout link." };
    return { ok: true, data: { url: session.url } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not start checkout." };
  }
}

/** Opens the Stripe customer portal (change plan, update card, cancel). */
export async function openBillingPortalAction(): Promise<ActionResult<{ url: string }>> {
  if (!proCheckoutAvailable()) return { ok: false, error: "Billing is not switched on yet." };
  const { client, user } = await requireProfile("/dashboard/profile");
  const { data: sub } = await client.from("subscriptions").select("provider_customer_id").eq("user_id", user.id).maybeSingle();
  const customerId = (sub as { provider_customer_id: string | null } | null)?.provider_customer_id;
  if (!customerId) return { ok: false, error: "No billing account yet. Upgrade to Pro first." };
  try {
    const portal = await createPortalSession(customerId, `${siteUrl()}/dashboard/profile`);
    return { ok: true, data: { url: portal.url } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not open billing." };
  }
}

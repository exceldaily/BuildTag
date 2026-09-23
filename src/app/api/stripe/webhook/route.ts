import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/server-env";
import { getSubscription, stripeConfig, verifyStripeSignature, type StripeCheckoutSession, type StripeSubscription } from "@/lib/stripe";
import { anonClient } from "@/lib/db/public";
import type { Plan, SubscriptionStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Verifies the signature, then writes through token-gated
 * security-definer functions (the app holds no service-role key).
 *
 * Handles:
 *   checkout.session.completed   decal order paid, or Pro subscription started
 *   customer.subscription.*      plan/status/renewal changes and cancellations
 */

interface StripeEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

function mapStatus(s: StripeSubscription["status"]): { plan: Plan; status: SubscriptionStatus } {
  switch (s) {
    case "active":
      return { plan: "pro", status: "active" };
    case "trialing":
      return { plan: "pro", status: "trialing" };
    case "past_due":
      return { plan: "pro", status: "past_due" };
    case "incomplete":
      return { plan: "free", status: "incomplete" };
    default:
      return { plan: "free", status: "canceled" };
  }
}

export async function POST(request: NextRequest) {
  const { webhookSecret, enabled } = stripeConfig();
  const token = serverEnv().BUILDTAG_INTERNAL_TOKEN;
  if (!enabled || !webhookSecret || !token) {
    return NextResponse.json({ ok: false, error: "Billing is not configured." }, { status: 503 });
  }

  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Bad signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad payload." }, { status: 400 });
  }

  const db = anonClient();

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as StripeCheckoutSession;
      if (session.mode === "payment" && session.metadata?.order_id && session.payment_status === "paid") {
        await db.rpc("billing_mark_order_paid", { p_token: token, p_order_id: session.metadata.order_id, p_reference: session.id });
      } else if (session.mode === "subscription" && session.subscription) {
        const sub = await getSubscription(session.subscription);
        const userId = session.client_reference_id ?? session.metadata?.user_id ?? sub.metadata?.user_id;
        if (userId) await upsert(db, token, userId, sub);
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const sub = event.data.object as StripeSubscription;
      let userId: string | null = sub.metadata?.user_id ?? null;
      if (!userId) {
        const { data } = await db.rpc("billing_user_for_customer", { p_token: token, p_customer_id: sub.customer });
        userId = (data as string | null) ?? null;
      }
      if (userId) await upsert(db, token, userId, sub);
    }
  } catch (err) {
    // Stripe retries on non-2xx; surface the failure so it does retry.
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Webhook failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, received: event.id });
}

async function upsert(db: ReturnType<typeof anonClient>, token: string, userId: string, sub: StripeSubscription) {
  const mapped = mapStatus(sub.status);
  const { error } = await db.rpc("billing_upsert_subscription", {
    p_token: token,
    p_user_id: userId,
    p_plan: mapped.plan,
    p_status: mapped.status,
    p_customer_id: sub.customer,
    p_subscription_id: sub.id,
    p_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  });
  if (error) throw new Error(error.message);
}

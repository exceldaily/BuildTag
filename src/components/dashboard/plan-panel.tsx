"use client";

import { BadgeCheck, CreditCard, Zap } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { openBillingPortalAction, startProCheckoutAction } from "@/lib/actions/billing";
import type { Plan, SubscriptionRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PRO_PRICE = { month: 5, year: 50 } as const;

interface Props {
  plan: Plan;
  subscription: Pick<SubscriptionRow, "status" | "current_period_end" | "provider_customer_id"> | null;
  features: Record<Plan, string[]>;
  billingEnabled: boolean;
  justUpgraded?: boolean;
}

export function PlanPanel({ plan, subscription, features, billingEnabled, justUpgraded = false }: Props) {
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [pending, start] = useTransition();
  const isPro = plan === "pro";
  const renews = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  const go = (fn: () => Promise<{ ok: boolean; data?: { url: string } | undefined; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      window.location.assign(res.data.url);
    });

  return (
    <div className={cn("panel p-5", isPro && "border-signal/50")}>
      <div className="flex items-center justify-between">
        <p className="label-tech">Plan</p>
        {isPro && (
          <span className="inline-flex items-center gap-1 rounded-full border border-signal/50 bg-signal/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-signal uppercase">
            <BadgeCheck className="size-3" aria-hidden="true" />
            Active
          </span>
        )}
      </div>
      <p className="mt-1 font-display text-3xl uppercase">{plan}</p>
      {justUpgraded && <p className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">Welcome to Pro. Your garage limits are lifted. It can take a few seconds for the plan to flip; refresh if it still says Free.</p>}
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {features[plan].map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>

      {isPro ? (
        <div className="mt-4 space-y-2">
          {renews && (
            <p className="text-xs text-muted-foreground">
              {subscription?.status === "past_due" ? "Payment failed. Update your card to keep Pro." : `Renews ${renews.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
            </p>
          )}
          {billingEnabled && (
            <button type="button" onClick={() => go(openBillingPortalAction)} disabled={pending} className="btn-ghost btn-small w-full">
              <CreditCard className="size-4" aria-hidden="true" />
              {pending ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-signal/40 bg-signal/5 p-3">
          <p className="font-display text-sm font-bold tracking-wider text-foreground uppercase">
            <Zap className="mr-1 inline size-4 text-signal" aria-hidden="true" />
            Go Pro
          </p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {features.pro.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-md border border-line p-1" role="radiogroup" aria-label="Billing period">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={interval === i}
                onClick={() => setInterval(i)}
                className={cn("rounded px-2 py-2 text-left transition-colors", interval === i ? "bg-signal text-white" : "hover:bg-white/5")}
              >
                <span className="block font-display text-xl leading-none font-extrabold">${PRO_PRICE[i]}</span>
                <span className={cn("block text-[10px] tracking-[0.14em] uppercase", interval === i ? "text-white/85" : "text-muted-foreground")}>{i === "month" ? "per month" : "per year · 2 months free"}</span>
              </button>
            ))}
          </div>
          {billingEnabled ? (
            <button type="button" onClick={() => go(() => startProCheckoutAction(interval))} disabled={pending} className="btn-signal mt-3 w-full">
              {pending ? "Opening checkout…" : `Upgrade for $${PRO_PRICE[interval]}/${interval === "month" ? "mo" : "yr"}`}
            </button>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Card checkout is being switched on. Pro pricing: $5 a month or $50 a year.</p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">Secure checkout by Stripe. Cancel any time from Manage billing.</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { adminSetPlanAction } from "@/lib/actions/admin";

export function MemberPlanActions({ userId, plan, provider }: { userId: string; plan: "free" | "pro"; provider: string | null }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");

  const run = (planTo: "free" | "pro", months: number | null) =>
    start(async () => {
      const res = await adminSetPlanAction({ userId, plan: planTo, months, note });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(planTo === "pro" ? (months ? `Pro for ${months} month${months === 1 ? "" : "s"}` : "Lifetime Pro granted") : "Pro removed");
      setNote("");
    });

  const isStripe = provider === "stripe" && plan === "pro";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (why)"
        maxLength={200}
        className="field h-8 w-36 text-xs"
        aria-label="Note for this plan change"
      />
      <button type="button" disabled={pending} onClick={() => run("pro", null)} className="btn-signal btn-small h-8 text-[10px]">
        Lifetime Pro
      </button>
      <button type="button" disabled={pending} onClick={() => run("pro", 12)} className="btn-ghost btn-small h-8 text-[10px]">
        Pro 1 yr
      </button>
      <button type="button" disabled={pending} onClick={() => run("pro", 1)} className="btn-ghost btn-small h-8 text-[10px]">
        Pro 1 mo
      </button>
      {plan === "pro" && (
        <button
          type="button"
          disabled={pending || isStripe}
          title={isStripe ? "Paid through Stripe. Cancel it from the Stripe dashboard instead." : "Remove complimentary Pro"}
          onClick={() => {
            if (window.confirm("Remove Pro from this member?")) run("free", null);
          }}
          className="btn-ghost btn-small h-8 border-destructive/50 text-[10px] text-destructive hover:bg-destructive/10 disabled:opacity-40"
        >
          Remove
        </button>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { cancelOrderAction, startCheckoutAction } from "@/lib/actions/orders";
import type { OrderRow } from "@/lib/types";

export function OrderActions({ order, paymentsEnabled }: { order: OrderRow; paymentsEnabled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (order.status !== "awaiting_payment" && order.status !== "draft") return null;

  return (
    <section className="panel space-y-2 p-4">
      <p className="label-tech">Payment</p>
      {paymentsEnabled ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await startCheckoutAction(order.id);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              if (res.data?.url) window.location.href = res.data.url;
            })
          }
          className="btn-signal w-full"
        >
          {pending ? "Opening checkout…" : "Pay now"}
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">Online payment is not switched on yet. Your order is saved; we will send an invoice and start production once it is paid.</p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Cancel this order?")) return;
          start(async () => {
            const res = await cancelOrderAction(order.id);
            if (!res.ok) toast.error(res.error);
            else router.refresh();
          });
        }}
        className="btn-ghost btn-small w-full"
      >
        Cancel order
      </button>
    </section>
  );
}

import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<OrderStatus, string> = {
  draft: "border-line text-muted-foreground",
  awaiting_payment: "border-neon-amber/60 text-neon-amber",
  paid: "border-neon-cyan/60 text-neon-cyan",
  preparing_artwork: "border-neon-cyan/60 text-neon-cyan",
  submitted_to_printer: "border-neon-purple/70 text-[#c4b5fd]",
  in_production: "border-neon-purple/70 text-[#c4b5fd]",
  shipped: "border-emerald-500/60 text-emerald-400",
  delivered: "border-emerald-500/60 text-emerald-400",
  cancelled: "border-line text-muted-foreground",
  production_error: "border-destructive/60 text-destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn("rounded border px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] uppercase", TONE[status])}>{ORDER_STATUS_LABEL[status]}</span>;
}

/** Customer-facing progression used by the timeline. */
export const ORDER_PIPELINE: OrderStatus[] = ["awaiting_payment", "paid", "preparing_artwork", "submitted_to_printer", "in_production", "shipped", "delivered"];

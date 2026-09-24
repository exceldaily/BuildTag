import { ADMIN_STATUS_LABEL, CUSTOMER_STATUS_LABEL, STATUS_TONE } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({ status, audience = "customer" }: { status: OrderStatus; audience?: "customer" | "admin" }) {
  const label = audience === "admin" ? ADMIN_STATUS_LABEL[status] : CUSTOMER_STATUS_LABEL[status];
  return <span className={cn("rounded border px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] uppercase", STATUS_TONE[status])}>{label}</span>;
}

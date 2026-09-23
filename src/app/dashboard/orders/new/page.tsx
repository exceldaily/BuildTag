import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireProfile } from "@/lib/supabase/server";
import type { PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";
import { CheckoutForm } from "@/components/orders/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function NewOrderPage({ searchParams }: PageProps<"/dashboard/orders/new">) {
  const sp = await searchParams;
  const snapshotId = typeof sp.snapshot === "string" ? sp.snapshot : "";
  const qty = Math.max(1, Math.min(500, Number(sp.qty) || 1));
  if (!/^[0-9a-f-]{36}$/i.test(snapshotId)) notFound();

  const { client, user, profile } = await requireProfile();
  const { data: snap } = await client.from("tag_production_snapshots").select("*").eq("id", snapshotId).maybeSingle();
  if (!snap) notFound();
  const snapshot = snap as ProductionSnapshotRow;
  const { data: spec } = snapshot.print_specification_id
    ? await client.from("print_specifications").select("*").eq("id", snapshot.print_specification_id).maybeSingle()
    : { data: null };
  const { data: lastOrder } = await client.from("orders").select("shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_phone").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/orders" className="label-tech hover:text-foreground">
        ← Orders
      </Link>
      <h1 className="mt-3 text-4xl sm:text-5xl">Checkout</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your proof is frozen: later changes to the build or the design will not affect this order.
      </p>
      <div className="mt-8">
        <CheckoutForm
          snapshot={snapshot}
          spec={(spec as PrintSpecificationRow | null) ?? null}
          initialQuantity={qty}
          email={user.email ?? ""}
          defaults={{ name: lastOrder?.shipping_name || profile.display_name, line1: lastOrder?.shipping_line1 ?? "", line2: lastOrder?.shipping_line2 ?? "", city: lastOrder?.shipping_city ?? "", state: lastOrder?.shipping_state ?? "", postal_code: lastOrder?.shipping_postal_code ?? "", country: lastOrder?.shipping_country || "US", phone: lastOrder?.shipping_phone ?? "" }}
        />
      </div>
    </div>
  );
}

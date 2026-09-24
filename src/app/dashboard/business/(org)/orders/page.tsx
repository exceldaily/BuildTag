import type { Metadata } from "next";
import Link from "next/link";

import { requireBusiness } from "@/lib/db/business";
import type { OrgOrder } from "@/lib/types";
import { vehicleTitle } from "@/lib/utils";

export const metadata: Metadata = { title: "Business orders", robots: { index: false } };

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default async function BusinessOrdersPage() {
  const { client, org } = await requireBusiness("manager");
  const { data, error } = await client.rpc("org_orders", { p_org: org.id });
  if (error) throw new Error(error.message);
  const orders = (data as unknown as OrgOrder[]) ?? [];

  return (
    <div>
      <h2 className="text-2xl">
        Orders <span className="text-muted-foreground">{orders.length}</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        BuildTags your team ordered for builds {org.name} manages. Orders stay with your business after the customer claims the build.
      </p>
      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No orders yet. Design a BuildTag from any unclaimed build and order it from the designer.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-tech px-3 py-2.5 font-normal">Order</th>
                <th className="label-tech px-3 py-2.5 font-normal">Build</th>
                <th className="label-tech px-3 py-2.5 font-normal">Qty</th>
                <th className="label-tech px-3 py-2.5 font-normal">Status</th>
                <th className="label-tech px-3 py-2.5 font-normal">Total</th>
                <th className="label-tech px-3 py-2.5 font-normal">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2.5 font-mono">{o.order_number}</td>
                  <td className="px-3 py-2.5">
                    {o.vehicle ? (
                      <Link href={`/build/${o.vehicle.slug}`} className="hover:underline">
                        {o.vehicle.nickname || vehicleTitle(o.vehicle)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{o.quantity ?? "—"}</td>
                  <td className="px-3 py-2.5 capitalize">{o.status.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2.5 tabular-nums">{money(o.total_cents, o.currency)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                    {o.placed_by ? ` · @${o.placed_by}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

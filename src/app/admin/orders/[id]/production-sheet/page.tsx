import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { productionSheetHtml } from "@/lib/orders/production-sheet";
import { proofUrl } from "@/lib/storage";
import { requireAdmin } from "@/lib/supabase/server";
import { qrSvg } from "@/lib/qr/generate";
import type { OrderItemRow, OrderRow, PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";

export const metadata: Metadata = { title: "Production sheet", robots: { index: false } };

/** Print-optimized manufacturer sheet. Admin only; contains no payment data. */
export default async function ProductionSheetPage({ params }: PageProps<"/admin/orders/[id]/production-sheet">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { client } = await requireAdmin();
  const { data: o } = await client.from("orders").select("*").eq("id", id).maybeSingle();
  if (!o) notFound();
  const order = o as OrderRow;
  const { data: items } = await client.from("order_items").select("*").eq("order_id", id).order("created_at").limit(1);
  const item = ((items ?? []) as OrderItemRow[])[0];
  if (!item) notFound();
  let snapshot: ProductionSnapshotRow | null = null;
  let spec: PrintSpecificationRow | null = null;
  let vehicle: { year: number | null; make: string; model: string; trim: string; nickname: string } | null = null;
  if (item.production_snapshot_id) {
    const { data: s } = await client.from("tag_production_snapshots").select("*").eq("id", item.production_snapshot_id).maybeSingle();
    snapshot = (s as ProductionSnapshotRow | null) ?? null;
    if (snapshot) {
      const [{ data: sp }, { data: v }] = await Promise.all([
        client.from("print_specifications").select("*").eq("id", snapshot.print_specification_id ?? "").maybeSingle(),
        client.from("vehicles").select("year, make, model, trim, nickname").eq("id", snapshot.vehicle_id ?? "").maybeSingle(),
      ]);
      spec = (sp as PrintSpecificationRow | null) ?? null;
      vehicle = (v as typeof vehicle) ?? null;
    }
  }
  const html = productionSheetHtml({
    order,
    item,
    snapshot,
    spec,
    vehicle,
    proofSrc: snapshot?.proof_storage_path ? proofUrl(snapshot.proof_storage_path) : snapshot?.png_storage_path ? `/api/snapshots/${snapshot.id}/artwork?format=png&inline=1` : null,
    qrSvg: snapshot ? qrSvg(snapshot.qr_destination_at_order, 120) : null,
    notes: "",
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <a href={`/admin/orders/${order.id}`} className="label-tech hover:text-foreground">
          ← Order
        </a>
        <span className="text-xs text-muted-foreground">Use your browser&apos;s Print (Ctrl/Cmd+P). Header and nav are hidden on paper.</span>
      </div>
      <style>{`@media print { header, nav, .no-print, footer { display: none !important; } body { background: #fff !important; } .sheet { border: 0 !important; } }`}</style>
      <div className="sheet overflow-hidden rounded-lg border border-line bg-white text-black">
        <iframe title="Production sheet" srcDoc={html} className="h-[1100px] w-full bg-white" />
      </div>
    </div>
  );
}

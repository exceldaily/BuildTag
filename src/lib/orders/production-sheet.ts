import { productionFileName, shippingLines } from "@/lib/orders/status";
import type { OrderItemRow, OrderRow, PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";

/**
 * Manufacturer-facing production sheet. Contains ONLY what is needed to
 * produce and ship: no payment, no internal notes, no customer email.
 * Rendered as print-optimized HTML (used by the admin page and the ZIP).
 */

export interface ProductionSheetInput {
  order: OrderRow;
  item: OrderItemRow;
  snapshot: ProductionSnapshotRow | null;
  spec: PrintSpecificationRow | null;
  vehicle: { year: number | null; make: string; model: string; trim: string; nickname: string } | null;
  /** Data URL or absolute URL for the proof thumbnail (optional). */
  proofSrc: string | null;
  /** Inline SVG markup for the QR thumbnail (optional). */
  qrSvg: string | null;
  notes: string;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function productionSheetHtml(input: ProductionSheetInput): string {
  const { order, item, snapshot, spec, vehicle } = input;
  const cut = (spec?.cut_path_style as { layerName?: string } | null)?.layerName ?? "CutContour";
  const bleed = spec ? `${Number(spec.bleed)} ${spec.units}` : "n/a";
  const safe = spec ? `${Number(spec.safe_margin)} ${spec.units}` : "n/a";
  const size = item.width && item.height ? `${Number(item.width)} x ${Number(item.height)} ${item.units === "mm" ? "mm" : "inches"}` : snapshot ? `${Number(snapshot.width)} x ${Number(snapshot.height)} ${snapshot.units === "mm" ? "mm" : "inches"}` : "";
  const material = (item.material ?? snapshot?.material ?? "").replace(/_/g, " ");
  const materialLabel = material === "gloss" ? "Automotive exterior vinyl, gloss" : material === "matte" ? "Automotive exterior vinyl, matte" : material;
  const validation = snapshot?.validation_status === "passed" ? "PASSED" : snapshot?.validation_status === "heuristic_only" ? "PASSED (warning)" : snapshot?.validation_status === "failed" ? "FAILED" : "n/a";
  const rows: [string, string][] = [
    ["Order", order.order_number],
    ["Product", item.product_name ?? item.description],
    ["SKU", item.product_sku ?? spec?.sku ?? ""],
    ["Finished size", size],
    ["Quantity", String(item.quantity)],
    ["Material", materialLabel],
    ["Finish", spec?.name ?? item.finish ?? ""],
    ["Cut", `Contour cut (layer ${cut})`],
    ["Bleed", bleed],
    ["Safe zone", safe],
    ["QR destination", snapshot?.qr_destination_at_order ?? ""],
    ["QR validation", validation],
    ["Artwork file", productionFileName(order.order_number, "production-svg")],
    ["Artwork checksum", snapshot?.artwork_sha256 ? `sha256 ${snapshot.artwork_sha256.slice(0, 16)}…` : "n/a"],
  ];
  const ship = shippingLines(order);
  const v = vehicle ? `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}${vehicle.nickname ? ` "${vehicle.nickname}"` : ""}`.trim() : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(order.order_number)} production sheet</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  body { font-family: Inter, Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 24px; }
  h1 { font-size: 22px; letter-spacing: .04em; margin: 0 0 4px; text-transform: uppercase; }
  .sub { color: #555; font-size: 12px; margin: 0 0 18px; }
  .grid { display: grid; grid-template-columns: 1fr 260px; gap: 24px; }
  table { border-collapse: collapse; width: 100%; }
  td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 13px; vertical-align: top; }
  td:first-child { color: #555; width: 150px; text-transform: uppercase; letter-spacing: .08em; font-size: 10px; }
  .box { border: 1px solid #ccc; padding: 12px; margin-bottom: 14px; }
  .box h2 { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 8px; color: #555; }
  .ship { font-size: 14px; line-height: 1.5; white-space: pre-line; }
  .thumb { width: 100%; max-height: 240px; object-fit: contain; border: 1px solid #ddd; background: #fff; }
  .qr svg { width: 120px; height: 120px; }
  .notes { min-height: 60px; font-size: 13px; white-space: pre-wrap; }
  .foot { margin-top: 18px; color: #777; font-size: 10px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style></head>
<body>
  <h1>BuildTags production order</h1>
  <p class="sub">${esc(order.order_number)} · ${esc(v)} · generated ${new Date().toISOString().slice(0, 10)}</p>
  <div class="grid">
    <div>
      <table>${rows.map(([k, val]) => `<tr><td>${esc(k)}</td><td>${esc(val)}</td></tr>`).join("")}</table>
      <div class="box" style="margin-top:14px">
        <h2>Ship to</h2>
        <div class="ship">${esc(ship.join("\n"))}${order.shipping_phone ? `\n${esc(order.shipping_phone)}` : ""}</div>
      </div>
      <div class="box">
        <h2>Production notes</h2>
        <div class="notes">${esc(input.notes || "Contour cut on the magenta CutContour path. Print at 100%; do not scale. Quiet zone around the QR must stay clear.")}</div>
      </div>
    </div>
    <div>
      <div class="box">
        <h2>Proof</h2>
        ${input.proofSrc ? `<img class="thumb" src="${esc(input.proofSrc)}" alt="Proof">` : `<p style="font-size:12px;color:#777">Proof image not available</p>`}
      </div>
      <div class="box qr">
        <h2>QR (test scan)</h2>
        ${input.qrSvg ?? `<p style="font-size:12px;color:#777">See artwork</p>`}
        <p style="font-size:11px;word-break:break-all;margin:8px 0 0">${esc(snapshot?.qr_destination_at_order ?? "")}</p>
      </div>
    </div>
  </div>
  <p class="foot">Production sheet contains only manufacturing and shipping information. Questions: orders@buildtags.app</p>
</body></html>`;
}

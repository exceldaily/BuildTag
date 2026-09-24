"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { adminPlaceCompOrderAction } from "@/lib/actions/admin";
import { saveTagDesignAction } from "@/lib/actions/designs";
import { evaluateQrSafety, type SafetyReport } from "@/lib/qr/safety";
import { MATERIAL_BY_ID, TEMPLATES, formatSize, moduleSizeMm, renderTagSvg, toInches } from "@/lib/tag";
import { PRINT_DPI, canvasToPngBlob, decodeAtSizes, downloadBlob, embedRemoteImages, makeTextToPath, rasterizeSvg, type DecodeResult } from "@/lib/tag/export";
import type { PrintGeometry } from "@/lib/tag/render";
import type { TagConfig, TagData } from "@/lib/tag/types";
import type { Plan, PrintSpecificationRow } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DesignerControls } from "./designer-controls";
import { DesignerPreview, type MockupPlacement, type MockupTone } from "./designer-preview";
import { QualityPanel } from "./quality-panel";

interface Props {
  vehicleId: string;
  code: string;
  data: TagData;
  plan: Plan;
  printSpecs: PrintSpecificationRow[];
  shopLogos: { id: string; name: string }[];
  initialDesign: { id: string; name: string; config: TagConfig } | null;
  savedDesigns: { id: string; name: string }[];
  /** Admin free-tag mode: design for another member and approve as a zero-total order. */
  admin?: { userId: string; username: string; displayName: string } | null;
}

const EMPTY_SHIPPING = { name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "US", phone: "" };

export interface DecodeState {
  status: "idle" | "testing" | "pass" | "fail";
  results: DecodeResult[];
}

interface DecodeRecord {
  svg: string;
  ok: boolean;
  results: DecodeResult[];
}

/**
 * BuildTag Designer. Every surface (preview, thumbnails, decode test, SVG,
 * PNG, production snapshot) renders through renderTagSvg() from the same
 * TagConfig, so the proof a customer approves is what gets printed.
 */
export function TagDesigner({ vehicleId, code, data, plan, printSpecs, shopLogos, initialDesign, savedDesigns, admin = null }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<TagConfig>(() => initialDesign?.config ?? TEMPLATES.stealth.build());
  const [name, setName] = useState(initialDesign?.name ?? "My BuildTag");
  const [designId, setDesignId] = useState<string | null>(initialDesign?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [saving, startSave] = useTransition();
  const [guides, setGuides] = useState(true);
  const [mockup, setMockup] = useState<"flat" | "car">("flat");
  const [placement, setPlacement] = useState<MockupPlacement>("rear-window");
  const [tone, setTone] = useState<MockupTone>("dark");
  const [decoded, setDecoded] = useState<DecodeRecord | null>(null);
  const [approving, setApproving] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [shipping, setShipping] = useState<Record<string, string>>(EMPTY_SHIPPING);
  const [compNote, setCompNote] = useState("");
  const decodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Print specification matching the chosen size + material (null for custom sizes).
  const spec = useMemo(() => printSpecs.find((s) => s.size_id === config.size.id && s.material === config.material) ?? null, [printSpecs, config.size.id, config.material]);
  const geometry: PrintGeometry | undefined = useMemo(
    () => (spec ? { bleedIn: Number(spec.bleed), safeMarginIn: Number(spec.safe_margin), cutPath: parseCut(spec.cut_path_style) } : undefined),
    [spec],
  );

  const preview = useMemo(() => renderTagSvg(config, data, { mode: "preview", guides, material: true, idPrefix: "bt-preview", geometry }), [config, data, guides, geometry]);
  const exportSvg = useMemo(() => renderTagSvg(config, data, { mode: "export", physical: true, idPrefix: "bt", geometry }), [config, data, geometry]);

  const safety: SafetyReport = useMemo(
    () =>
      evaluateQrSafety({
        qrDark: config.colors.qrDark,
        qrLight: config.colors.qrLight,
        moduleMm: moduleSizeMm(config, preview.layout),
        minModuleMm: spec ? Number(spec.min_module_mm) : 0.5,
        logoCoverage: preview.logoCoverage,
        quietZoneModules: 4,
        qrSqueezed: preview.layout.qrSqueezed,
        imageBackground: config.background.kind === "image",
        frameOutsideBlock: true,
        hasQr: preview.layout.qr !== null,
      }),
    [config, preview, spec],
  );

  // Real decoder test on the export artwork, debounced against edits.
  useEffect(() => {
    if (decodeTimer.current) clearTimeout(decodeTimer.current);
    const { svg, viewBox } = exportSvg;
    decodeTimer.current = setTimeout(async () => {
      const result = await decodeAtSizes(svg, viewBox.h / viewBox.w, data.scanUrl);
      setDecoded({ svg, ok: result.ok, results: result.results });
    }, 600);
    return () => {
      if (decodeTimer.current) clearTimeout(decodeTimer.current);
    };
  }, [exportSvg, data.scanUrl]);

  const decode: DecodeState = decoded && decoded.svg === exportSvg.svg ? { status: decoded.ok ? "pass" : "fail", results: decoded.results } : { status: "testing", results: decoded?.results ?? [] };

  const update = useCallback((patch: Partial<TagConfig> | ((c: TagConfig) => TagConfig)) => {
    setConfig((c) => (typeof patch === "function" ? patch(c) : { ...c, ...patch }));
    setDirty(true);
  }, []);

  const save = useCallback(
    (asNew = false) => {
      startSave(async () => {
        const res = await saveTagDesignAction({ id: asNew ? null : designId, vehicleId, name, config });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setDesignId(res.data.id);
        setDirty(false);
        if (!autosave || asNew) toast.success(asNew ? "Saved as a new design" : "Design saved");
      });
    },
    [designId, vehicleId, name, config, autosave],
  );

  // Optional autosave for existing designs.
  useEffect(() => {
    if (!autosave || !designId || !dirty) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(false), 2500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [autosave, designId, dirty, config, name, save]);

  const validated = decode.status === "pass" && safety.quality !== "invalid";
  const orderable = validated && spec !== null && spec.available && Boolean(spec.provider_sku);

  /** Production export: fonts to paths, remote images embedded, bleed + cut path. */
  const buildProductionSvg = useCallback(async () => {
    const textToPath = await makeTextToPath([config.font]);
    const rendered = renderTagSvg(config, data, { mode: "export", physical: true, idPrefix: "bt", geometry, textToPath });
    const svg = await embedRemoteImages(rendered.svg);
    return { svg, viewBox: rendered.viewBox };
  }, [config, data, geometry]);

  const pngSize = useCallback(() => {
    const inches = toInches(config.size);
    const bleed = geometry ? geometry.bleedIn * 2 : 0;
    return { w: Math.round((inches.width + bleed) * PRINT_DPI), h: Math.round((inches.height + bleed) * PRINT_DPI) };
  }, [config.size, geometry]);

  const downloadSvg = async () => {
    if (!validated) return;
    try {
      const { svg } = await buildProductionSvg();
      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `buildtag-${code}-${config.template}.svg`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the SVG");
    }
  };

  const downloadPng = async () => {
    if (!validated) return;
    try {
      const { svg } = await buildProductionSvg();
      const { w, h } = pngSize();
      const canvas = await rasterizeSvg(svg, w, h, null);
      downloadBlob(await canvasToPngBlob(canvas), `buildtag-${code}-${config.template}-${PRINT_DPI}dpi.png`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the PNG");
    }
  };

  /** Approve proof: freeze artwork into an immutable production snapshot, then go to checkout. */
  const approveAndOrder = async () => {
    if (!orderable || !spec) return;
    setApproving(true);
    try {
      if (!admin && (dirty || !designId)) {
        const res = await saveTagDesignAction({ id: designId, vehicleId, name, config });
        if (res.ok) {
          setDesignId(res.data.id);
          setDirty(false);
        }
      }
      const { svg, viewBox } = await buildProductionSvg();
      // Validate the production SVG itself (paths, not text) before freezing it.
      const check = await decodeAtSizes(svg, viewBox.h / viewBox.w, data.scanUrl);
      const { w, h } = pngSize();
      const canvas = await rasterizeSvg(svg, w, h, null);
      const png = await canvasToPngBlob(canvas);
      const form = new FormData();
      form.set(
        "meta",
        JSON.stringify({
          vehicleId,
          designId,
          printSpecificationId: spec.id,
          quantity,
          validationStatus: check.ok ? "passed" : "failed",
          validationReport: { safety, decode: check.results, dpi: PRINT_DPI, pixels: { w, h } },
          config,
          admin: Boolean(admin),
        }),
      );
      form.set("svg", new File([svg], "artwork.svg", { type: "image/svg+xml" }));
      form.set("png", new File([png], "artwork.png", { type: "image/png" }));
      const res = await fetch("/api/snapshots", { method: "POST", body: form });
      const json = (await res.json()) as { ok: boolean; snapshot?: { id: string }; error?: string };
      if (!res.ok || !json.ok || !json.snapshot) throw new Error(json.error ?? "Could not create the production snapshot");
      if (!check.ok) {
        toast.error("The production artwork failed the decoder test. Adjust the design and try again.");
        setApproving(false);
        return;
      }
      if (admin) {
        const placed = await adminPlaceCompOrderAction({ snapshotId: json.snapshot.id, userId: admin.userId, quantity, shipping, note: compNote });
        if (!placed.ok) throw new Error(placed.error);
        toast.success(`Free tag order created for @${admin.username}`);
        router.push("/admin/orders");
        return;
      }
      router.push(`/dashboard/orders/new?snapshot=${json.snapshot.id}&qty=${quantity}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve the proof");
      setApproving(false);
    }
  };

  const material = MATERIAL_BY_ID[config.material];
  const specOrderable = spec ? spec.available && Boolean(spec.provider_sku) : false;

  return (
    <div className="-mx-4 sm:mx-0">
      {/* Top bar */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
        <div className="flex items-center gap-3">
          <Link href={admin ? "/admin/tags" : `/dashboard/vehicles/${vehicleId}/buildtag`} className="label-tech hover:text-foreground">
            {admin ? "← Free tags" : "← BuildTag"}
          </Link>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value.slice(0, 60));
              setDirty(true);
            }}
            aria-label="Design name"
            className="h-9 w-48 rounded-md border border-line bg-transparent px-2 font-display text-lg font-bold tracking-wider uppercase outline-none focus:border-foreground/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {admin ? (
            <span className="rounded-full border border-neon-amber/60 bg-neon-amber/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-neon-amber uppercase">
              Free tag for @{admin.username}
            </span>
          ) : (
            <>
              <span className="label-tech">{saving ? "Saving…" : dirty ? (autosave && designId ? "Autosaving…" : "Unsaved") : designId ? "Saved" : "New design"}</span>
              {designId && (
                <button type="button" onClick={() => save(true)} disabled={saving} className="btn-ghost btn-small">
                  Duplicate
                </button>
              )}
              <button type="button" onClick={() => save(false)} disabled={saving} className="btn-ghost btn-small">
                {designId ? "Save" : "Save design"}
              </button>
            </>
          )}
          <button type="button" onClick={approveAndOrder} disabled={!orderable || approving} className="btn-signal btn-small" title={orderable ? "Freeze this proof and order decals" : "Fix validation issues or pick an orderable material first"}>
            {approving ? "Preparing proof…" : admin ? "Approve & create free order" : "Approve & order"}
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_300px] xl:grid-cols-[380px_minmax(0,1fr)_340px] 2xl:grid-cols-[440px_minmax(0,1fr)_400px] 2xl:gap-6 lg:items-start">
        {/* Center preview: first on mobile */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-20">
          <DesignerPreview
            svg={preview.svg}
            layout={preview.layout}
            config={config}
            guides={guides}
            onToggleGuides={() => setGuides((g) => !g)}
            mockup={mockup}
            onMockup={setMockup}
            placement={placement}
            onPlacement={setPlacement}
            tone={tone}
            onTone={setTone}
            code={code}
            safety={safety}
            decode={decode}
          />
        </div>

        {/* Right: info + order */}
        <aside className="order-2 space-y-4 px-4 sm:px-0 lg:order-3">
          <QualityPanel safety={safety} decode={decode} onRetest={() => setDecoded(null)} />

          <section className="panel p-4">
            <p className="label-tech">This BuildTag</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row k="Vehicle" v={[data.year, data.make, data.model].filter(Boolean).join(" ") || "Untitled"} />
              {data.nickname && <Row k="Nickname" v={data.nickname} />}
              {data.powerLabel && <Row k="Power" v={data.powerLabel} />}
              <Row k="Permanent code" v={<span className="font-mono">{code}</span>} />
              <Row k="Size" v={formatSize(config.size)} />
              <Row k="Material" v={material.name} />
              <Row k="Template" v={TEMPLATES[config.template].name} />
              <Row k="Plan" v={plan} />
            </dl>
          </section>

          <section className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="label-tech">Order</p>
              {spec ? (
                specOrderable ? (
                  <span className="rounded border border-emerald-500/50 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] text-emerald-400 uppercase">Available</span>
                ) : (
                  <span className="rounded border border-neon-amber/60 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] text-neon-amber uppercase">Preview only</span>
                )
              ) : (
                <span className="rounded border border-line px-1.5 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">Custom size</span>
              )}
            </div>
            {spec && admin ? (
              <>
                <p className="mt-2 font-display text-3xl font-bold uppercase">
                  Free <span className="text-sm text-muted-foreground">for {admin.displayName || admin.username}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {spec.name} · {Number(spec.width)}×{Number(spec.height)} {spec.units} · order is created as paid with a $0 total
                </p>
                <label className="mt-3 block">
                  <span className="field-label">Quantity</span>
                  <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="field" />
                </label>
                <p className="field-label mt-3">Ship to (optional, can be added later)</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["name", "Name", "col-span-2"],
                      ["line1", "Address", "col-span-2"],
                      ["city", "City", ""],
                      ["state", "State", ""],
                      ["postal_code", "ZIP", ""],
                      ["country", "Country (2 letters)", ""],
                    ] as const
                  ).map(([k, label, cls]) => (
                    <input key={k} value={shipping[k] ?? ""} onChange={(e) => setShipping((s) => ({ ...s, [k]: e.target.value }))} placeholder={label} aria-label={label} className={cn("field h-9 text-xs", cls)} />
                  ))}
                </div>
                <input value={compNote} onChange={(e) => setCompNote(e.target.value.slice(0, 200))} placeholder="Note (why it is free)" aria-label="Note" className="field mt-2 h-9 text-xs" />
              </>
            ) : spec ? (
              <>
                <p className="mt-2 font-display text-3xl font-bold uppercase">
                  ${(unitPrice(spec.price_cents, quantity) / 100).toFixed(2)} <span className="text-sm text-muted-foreground">each</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {spec.name} · {Number(spec.width)}×{Number(spec.height)} {spec.units} · 3+ save 10%, 10+ save 20% · free shipping over $50
                </p>
                <label className="mt-3 block">
                  <span className="field-label">Quantity</span>
                  <input type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} className="field" />
                </label>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Custom sizes export as digital files. Pick a preset size to order printed decals.</p>
            )}
            <button type="button" onClick={approveAndOrder} disabled={!orderable || approving} className="btn-signal mt-4 w-full">
              {approving ? "Preparing proof…" : admin ? "Approve & create free order" : "Approve proof & order"}
            </button>
            {!validated && <p className="mt-2 text-xs text-destructive">Ordering unlocks when the scan test passes.</p>}
            {validated && spec && !specOrderable && <p className="mt-2 text-xs text-neon-amber">{material.name} is preview only until a print partner carries it. Gloss and Matte ship today.</p>}
          </section>

          {admin && (
          <section className="panel p-4">
            <p className="label-tech">Digital export</p>
            <p className="mt-1 text-xs text-muted-foreground">Print-ready files for your own shop: vector SVG with fonts converted to paths, bleed and a named cut path, plus a {PRINT_DPI} DPI PNG.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={downloadSvg} disabled={!validated} className="btn-ghost btn-small">
                SVG
              </button>
              <button type="button" onClick={downloadPng} disabled={!validated} className="btn-ghost btn-small">
                PNG
              </button>
            </div>
          </section>
          )}

          {!admin && savedDesigns.length > 0 && (
            <section className="panel p-4">
              <p className="label-tech">Saved designs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {savedDesigns.map((d) => (
                  <Link key={d.id} href={`/dashboard/vehicles/${vehicleId}/tag-designer?design=${d.id}`} className={cn("btn-ghost btn-small", d.id === designId && "border-signal text-foreground")}>
                    {d.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Left: controls */}
        <div className="order-3 lg:order-1">
          <DesignerControls config={config} data={data} plan={plan} printSpecs={printSpecs} shopLogos={shopLogos} autosave={autosave} onAutosave={setAutosave} onChange={update} />
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function unitPrice(cents: number, qty: number): number {
  if (qty >= 10) return Math.round(cents * 0.8);
  if (qty >= 3) return Math.round(cents * 0.9);
  return cents;
}

function parseCut(json: unknown): PrintGeometry["cutPath"] {
  const o = (json ?? {}) as { layerName?: string; stroke?: string; strokeWidth?: number };
  return { layerName: o.layerName ?? "CutContour", stroke: o.stroke ?? "#FF00FF", strokeWidthPt: typeof o.strokeWidth === "number" ? o.strokeWidth : 0.25 };
}

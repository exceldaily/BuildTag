"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveTagDesignAction } from "@/lib/actions/designs";
import { TEMPLATES, overallStatus, renderTagSvg, runDesignChecks } from "@/lib/tag";
import { decodeQrFromSvg, type DecodeResult } from "@/lib/tag/export";
import type { TagConfig, TagData } from "@/lib/tag/types";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DesignerControls, type PanelId } from "./designer-controls";
import { DesignerExport } from "./designer-export";
import { DesignerPreview } from "./designer-preview";

interface Props {
  vehicleId: string;
  code: string;
  data: TagData;
  plan: Plan;
  initialDesign: { id: string; name: string; config: TagConfig } | null;
  savedDesigns: { id: string; name: string }[];
}

export type DecodeState = { status: "idle" | "testing" | "pass" | "fail"; result: DecodeResult | null };

interface DecodeRecord {
  /** The export SVG that was decoded; anything else means a test is pending. */
  svg: string;
  result: DecodeResult | null;
}

/**
 * BuildTag Designer. All rendering runs through renderTagSvg(), so preview,
 * checks, the decode test and both exports use the exact same artwork.
 */
export function TagDesigner({ vehicleId, code, data, plan, initialDesign, savedDesigns }: Props) {
  const [config, setConfig] = useState<TagConfig>(() => initialDesign?.config ?? TEMPLATES.stealth.build());
  const [name, setName] = useState(initialDesign?.name ?? "My BuildTag");
  const [designId, setDesignId] = useState<string | null>(initialDesign?.id ?? null);
  const [panel, setPanel] = useState<PanelId>("template");
  const [guides, setGuides] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [decoded, setDecoded] = useState<DecodeRecord | null>(null);
  const decodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rendered = useMemo(() => renderTagSvg(config, data, { guides, idPrefix: "bt-preview" }), [config, data, guides]);
  const exportSvg = useMemo(() => renderTagSvg(config, data, { physical: true, idPrefix: "bt" }), [config, data]);
  const checks = useMemo(() => runDesignChecks(config, rendered.layout), [config, rendered.layout]);
  const status = overallStatus(checks);

  // Programmatic scan test, debounced against edits. The effect only
  // schedules work; state changes happen in the timer callback.
  useEffect(() => {
    if (decodeTimer.current) clearTimeout(decodeTimer.current);
    if (!config.content.qr) return;
    const { svg, layout } = exportSvg;
    decodeTimer.current = setTimeout(async () => {
      const px = 900;
      const result = await decodeQrFromSvg(svg, px, Math.round((px * layout.height) / layout.width), data.scanUrl);
      setDecoded({ svg, result });
    }, 500);
    return () => {
      if (decodeTimer.current) clearTimeout(decodeTimer.current);
    };
  }, [exportSvg, data.scanUrl, config.content.qr]);

  const decode: DecodeState = !config.content.qr
    ? { status: "fail", result: null }
    : decoded && decoded.svg === exportSvg.svg
      ? { status: decoded.result?.ok ? "pass" : "fail", result: decoded.result }
      : { status: "testing", result: decoded?.result ?? null };

  const update = useCallback((patch: Partial<TagConfig> | ((c: TagConfig) => TagConfig)) => {
    setConfig((c) => (typeof patch === "function" ? patch(c) : { ...c, ...patch }));
    setDirty(true);
  }, []);

  const save = (asNew = false) => {
    startSave(async () => {
      const res = await saveTagDesignAction({ id: asNew ? null : designId, vehicleId, name, config });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDesignId(res.data.id);
      setDirty(false);
      toast.success(asNew ? "Saved as a new design" : "Design saved");
    });
  };

  const readyToPrint = status !== "block" && decode.status === "pass";

  return (
    <div className="-mx-4 sm:mx-0">
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/vehicles/${vehicleId}/buildtag`} className="label-tech hover:text-foreground">
            ← BuildTag
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
        <div className="flex items-center gap-2">
          <span className="label-tech">{saving ? "Saving…" : dirty ? "Unsaved" : designId ? "Saved" : "New design"}</span>
          {designId && (
            <button type="button" onClick={() => save(true)} disabled={saving} className="btn-ghost btn-small">
              Save as new
            </button>
          )}
          <button type="button" onClick={() => save(false)} disabled={saving} className="btn-signal btn-small">
            {designId ? "Save" : "Save design"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-0 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        {/* Preview: sticky on top for phones, right column on desktop */}
        <div className="sticky top-16 z-20 order-1 bg-background/95 px-4 pb-3 backdrop-blur sm:px-0 lg:static lg:order-2 lg:bg-transparent lg:pb-0">
          <DesignerPreview
            svg={rendered.svg}
            layout={rendered.layout}
            config={config}
            guides={guides}
            onToggleGuides={() => setGuides((g) => !g)}
            status={status}
            decode={decode}
            code={code}
          />
        </div>

        {/* Controls */}
        <div className="order-2 lg:order-1">
          <div className="-mx-0 overflow-x-auto border-b border-line px-4 sm:px-0">
            <PanelTabs panel={panel} onChange={setPanel} />
          </div>
          <div className="px-4 py-5 sm:px-0">
            {panel === "export" ? (
              <DesignerExport
                config={config}
                svg={exportSvg.svg}
                layout={exportSvg.layout}
                checks={checks}
                status={status}
                decode={decode}
                readyToPrint={readyToPrint}
                code={code}
                scanUrl={data.scanUrl}
                onRetest={() => setDecoded(null)}
              />
            ) : (
              <DesignerControls panel={panel} config={config} data={data} plan={plan} onChange={update} />
            )}
          </div>
          {savedDesigns.length > 0 && panel === "template" && (
            <div className="px-4 pb-6 sm:px-0">
              <p className="label-tech mb-2">Your saved designs</p>
              <div className="flex flex-wrap gap-2">
                {savedDesigns.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboard/vehicles/${vehicleId}/tag-designer?design=${d.id}`}
                    className={cn("btn-ghost btn-small", d.id === designId && "border-signal text-foreground")}
                  >
                    {d.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PANELS: { id: PanelId; label: string }[] = [
  { id: "template", label: "Template" },
  { id: "style", label: "Style" },
  { id: "shape", label: "Shape" },
  { id: "frame", label: "QR Frame" },
  { id: "content", label: "Content" },
  { id: "colors", label: "Colors" },
  { id: "size", label: "Size" },
  { id: "export", label: "Test & Export" },
];

function PanelTabs({ panel, onChange }: { panel: PanelId; onChange: (p: PanelId) => void }) {
  return (
    <div role="tablist" aria-label="Designer sections" className="flex gap-1">
      {PANELS.map((p) => (
        <button
          key={p.id}
          role="tab"
          type="button"
          aria-selected={panel === p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "inline-flex h-10 items-center border-b-2 px-3 font-display text-sm font-semibold tracking-[0.12em] uppercase whitespace-nowrap transition-colors",
            panel === p.id ? "border-signal text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            p.id === "export" && "text-signal",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

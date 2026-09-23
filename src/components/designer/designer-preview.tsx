"use client";

import { formatSize } from "@/lib/tag";
import type { SafetyReport } from "@/lib/qr/safety";
import type { TagConfig, TagLayout } from "@/lib/tag/types";
import { cn } from "@/lib/utils";

import { CarMockup } from "./designer-mockup";
import type { DecodeState } from "./tag-designer";

export type MockupPlacement = "rear-window" | "quarter-window" | "bumper" | "body-panel";
export type MockupTone = "dark" | "light";

interface Props {
  svg: string;
  layout: TagLayout;
  config: TagConfig;
  guides: boolean;
  onToggleGuides: () => void;
  mockup: "flat" | "car";
  onMockup: (m: "flat" | "car") => void;
  placement: MockupPlacement;
  onPlacement: (p: MockupPlacement) => void;
  tone: MockupTone;
  onTone: (t: MockupTone) => void;
  code: string;
  safety: SafetyReport;
  decode: DecodeState;
}

export function DesignerPreview({ svg, layout, config, guides, onToggleGuides, mockup, onMockup, placement, onPlacement, tone, onTone, code, safety, decode }: Props) {
  const aspect = layout.height / layout.width;
  const status = decode.status === "pass" && safety.quality !== "invalid" ? "ok" : decode.status === "testing" ? "testing" : "bad";

  return (
    <div className="panel p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md border border-line p-1">
          {(["flat", "car"] as const).map((m) => (
            <button key={m} type="button" onClick={() => onMockup(m)} className={cn("h-8 rounded px-3 font-display text-xs font-bold tracking-[0.14em] uppercase", mockup === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              {m === "flat" ? "Artwork" : "Preview on car"}
            </button>
          ))}
        </div>
        {mockup === "flat" ? (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={guides} onChange={onToggleGuides} className="size-3.5 accent-[#ff2d7a]" />
            Show safe zones
          </label>
        ) : (
          <div className="flex flex-wrap gap-1">
            <select value={placement} onChange={(e) => onPlacement(e.target.value as MockupPlacement)} className="field h-8 w-auto text-xs" aria-label="Placement">
              <option value="rear-window">Rear window</option>
              <option value="quarter-window">Quarter window</option>
              <option value="bumper">Bumper</option>
              <option value="body-panel">Body panel</option>
            </select>
            <div className="flex gap-1 rounded-md border border-line p-1">
              {(["dark", "light"] as const).map((t) => (
                <button key={t} type="button" onClick={() => onTone(t)} className={cn("h-6 rounded px-2 font-display text-[10px] font-bold tracking-[0.14em] uppercase", tone === t ? "bg-foreground text-background" : "text-muted-foreground")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {mockup === "flat" ? (
        <div className="mx-auto max-w-[560px]">
          <div
            className="w-full rounded-md p-4"
            style={{
              aspectRatio: `${layout.width} / ${layout.height}`,
              backgroundImage:
                "linear-gradient(45deg,#1b1733 25%,transparent 25%),linear-gradient(-45deg,#1b1733 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1b1733 75%),linear-gradient(-45deg,transparent 75%,#1b1733 75%)",
              backgroundSize: "18px 18px",
              backgroundPosition: "0 0,0 9px,9px -9px,-9px 0",
              backgroundColor: "#100d1f",
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      ) : (
        <CarMockup svg={svg} aspect={aspect} placement={placement} tone={tone} widthIn={config.size.unit === "mm" ? config.size.width / 25.4 : config.size.width} />
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="label-tech">{formatSize(config.size)}</span>
        <span className="font-mono text-muted-foreground">{code}</span>
        <span className={cn("label-tech", status === "ok" ? "text-emerald-400" : status === "testing" ? "text-neon-amber" : "text-destructive")} aria-live="polite">
          {status === "ok" ? "Validated · ready to order" : status === "testing" ? "Testing QR…" : "Design needs changes"}
        </span>
      </div>
      {mockup === "flat" && guides && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="text-[#22D3EE]">Cyan</span> cut line · <span className="text-[#f43f5e]">red</span> bleed · <span className="text-[#a3e635]">green</span> cut-safe · <span className="text-[#c084fc]">purple</span> text-safe · <span className="text-[#F59E0B]">amber</span> protected QR block including its quiet zone. Guides never export.
        </p>
      )}
      {mockup === "car" && <p className="mt-2 text-[11px] text-muted-foreground">Placement preview only. Size is approximate relative to a mid-size coupe; verify with a paper cut-out before printing.</p>}
    </div>
  );
}

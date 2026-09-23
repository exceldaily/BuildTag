"use client";

import { physicalSize } from "@/lib/tag";
import type { CheckLevel } from "@/lib/tag/checks";
import type { TagConfig, TagLayout } from "@/lib/tag/types";
import { cn } from "@/lib/utils";

import type { DecodeState } from "./tag-designer";

interface Props {
  svg: string;
  layout: TagLayout;
  config: TagConfig;
  guides: boolean;
  onToggleGuides: () => void;
  status: CheckLevel;
  decode: DecodeState;
  code: string;
}

export function DesignerPreview({ svg, layout, config, guides, onToggleGuides, status, decode, code }: Props) {
  const phys = physicalSize(config);
  const fmt = (n: number) => (config.size.unit === "mm" ? `${n.toFixed(0)} mm` : `${n.toFixed(2)} in`);
  const aspect = layout.height / layout.width;

  const statusLabel =
    status === "block" ? "Design needs changes" : decode.status === "testing" ? "Testing QR…" : decode.status === "pass" ? "QR reads correctly" : decode.status === "fail" ? "QR did not decode" : "Checking…";
  const statusColor = status === "block" || decode.status === "fail" ? "text-destructive" : decode.status === "pass" && status === "ok" ? "text-emerald-400" : "text-amber-300";

  return (
    <div className="panel p-3 sm:p-4">
      <div className="mx-auto max-h-[36vh] lg:max-h-none" style={{ aspectRatio: `${layout.width} / ${layout.height}`, maxWidth: aspect > 1 ? `${Math.min(100, 36 / aspect / 0.36)}%` : "100%" }}>
        {/* Checkerboard shows transparency outside the cut line. */}
        <div
          className="size-full rounded-md p-3"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#1b1b1e 25%,transparent 25%),linear-gradient(-45deg,#1b1b1e 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1b1b1e 75%),linear-gradient(-45deg,transparent 75%,#1b1b1e 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
            backgroundColor: "#111113",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="label-tech">
            {fmt(phys.width)} × {fmt(phys.height)}
          </span>
          <span className="font-mono text-muted-foreground">{code}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("label-tech", statusColor)} aria-live="polite">
            {statusLabel}
          </span>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input type="checkbox" checked={guides} onChange={onToggleGuides} className="size-3.5 accent-[#e4162b]" />
            Guides
          </label>
        </div>
      </div>
      {guides && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="text-[#22D3EE]">Cyan</span> dashed line: cut line. <span className="text-[#F59E0B]">Amber</span> box: protected QR area including its quiet zone. Nothing decorative is drawn inside it.
        </p>
      )}
    </div>
  );
}

"use client";

import { formatSize } from "@/lib/tag";
import type { SafetyReport } from "@/lib/qr/safety";
import type { TagConfig, TagLayout } from "@/lib/tag/types";
import { cn } from "@/lib/utils";

import type { DecodeState } from "./tag-designer";

interface Props {
  svg: string;
  layout: TagLayout;
  config: TagConfig;
  guides: boolean;
  onToggleGuides: () => void;
  code: string;
  safety: SafetyReport;
  decode: DecodeState;
}

export function DesignerPreview({ svg, layout, config, guides, onToggleGuides, code, safety, decode }: Props) {
  const status = decode.status === "pass" && safety.quality !== "invalid" ? "ok" : decode.status === "testing" ? "testing" : "bad";

  return (
    <div className="panel p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="label-tech">Artwork</span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={guides} onChange={onToggleGuides} className="size-3.5 accent-[#ff2d7a]" />
          Show safe zones
        </label>
      </div>

      <div className="mx-auto max-w-[560px] xl:max-w-[720px] 2xl:max-w-[880px]">
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="label-tech">{formatSize(config.size)}</span>
        <span className="font-mono text-muted-foreground">{code}</span>
        <span className={cn("label-tech", status === "ok" ? "text-emerald-400" : status === "testing" ? "text-neon-amber" : "text-destructive")} aria-live="polite">
          {status === "ok" ? "Validated · ready to order" : status === "testing" ? "Testing QR…" : "Design needs changes"}
        </span>
      </div>
      {guides && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="text-[#22D3EE]">Cyan</span> cut line · <span className="text-[#f43f5e]">red</span> bleed · <span className="text-[#a3e635]">green</span> cut-safe · <span className="text-[#c084fc]">purple</span> text-safe · <span className="text-[#F59E0B]">amber</span> protected QR block including its quiet zone. Guides never export.
        </p>
      )}
    </div>
  );
}

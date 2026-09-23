"use client";

import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { physicalSize } from "@/lib/tag";
import type { CheckLevel, DesignCheck } from "@/lib/tag/checks";
import { PRINT_DPI, canvasToPngBlob, downloadBlob, rasterizeSvg } from "@/lib/tag/export";
import { qrSvg } from "@/lib/qr/generate";
import type { TagConfig, TagLayout } from "@/lib/tag/types";
import { cn } from "@/lib/utils";

import type { DecodeState } from "./tag-designer";

interface Props {
  config: TagConfig;
  svg: string;
  layout: TagLayout;
  checks: DesignCheck[];
  status: CheckLevel;
  decode: DecodeState;
  readyToPrint: boolean;
  code: string;
  scanUrl: string;
  onRetest: () => void;
}

export function DesignerExport({ config, svg, layout, checks, status, decode, readyToPrint, code, scanUrl, onRetest }: Props) {
  const [transparent, setTransparent] = useState(true);
  const [busy, setBusy] = useState(false);
  const phys = physicalSize(config);
  const pxW = Math.round(phys.widthIn * PRINT_DPI);
  const pxH = Math.round(phys.heightIn * PRINT_DPI);
  const plainQr = qrSvg(scanUrl, 220);

  const filename = `buildtag-${code}-${config.template}-${config.shape}`;

  const downloadSvg = () => {
    if (!readyToPrint) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
  };

  const downloadPng = async () => {
    if (!readyToPrint) return;
    setBusy(true);
    try {
      const canvas = await rasterizeSvg(svg, pxW, pxH, transparent ? null : "#ffffff");
      downloadBlob(await canvasToPngBlob(canvas), `${filename}-${PRINT_DPI}dpi.png`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export PNG");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line p-4">
        <p className="eyebrow">Test your BuildTag</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="mx-auto w-44 rounded-md bg-white p-2" dangerouslySetInnerHTML={{ __html: plainQr.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"') }} />
          <div>
            <p className="text-sm">
              <strong>Scan this code with your phone before printing.</strong> It must open your build page. Then scan the
              preview of the finished decal on the right to confirm the styling did not hurt readability.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Encodes {scanUrl}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line p-4">
        <div className="flex items-center justify-between">
          <p className="label-tech">QR status</p>
          <button type="button" onClick={onRetest} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className={cn("size-3.5", decode.status === "testing" && "animate-spin")} aria-hidden="true" /> Re-run test
          </button>
        </div>
        <p className={cn("mt-1 font-display text-3xl font-bold uppercase", readyToPrint ? "text-emerald-400" : "text-destructive")}>
          {readyToPrint ? "Ready to print" : decode.status === "testing" ? "Testing…" : "Design needs changes"}
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex gap-2">
            <Dot level={decode.status === "pass" ? "ok" : decode.status === "testing" ? "warn" : "block"} />
            <span>
              <strong>Decode test:</strong>{" "}
              {decode.status === "pass"
                ? "the exported artwork decodes to your scan URL."
                : decode.status === "testing"
                  ? "rendering the export and decoding it…"
                  : decode.result?.decoded
                    ? `decoded a different value (${decode.result.decoded}).`
                    : "the decoder could not read the code in this design. Increase size, remove the frame, or fix contrast."}
            </span>
          </li>
          {checks.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Dot level={c.level} />
              <span>
                <strong>{c.title}.</strong> {c.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line p-4">
        <p className="label-tech">Print export</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Info label="Width" value={`${phys.width.toFixed(2)} ${phys.unit}`} />
          <Info label="Height" value={`${phys.height.toFixed(2)} ${phys.unit}`} />
          <Info label="PNG pixels" value={`${pxW} × ${pxH}`} />
          <Info label="Resolution" value={`${PRINT_DPI} DPI`} />
        </dl>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="size-4 accent-[#ff2d7a]" />
          Transparent background outside the cut line (PNG)
        </label>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={downloadSvg} disabled={!readyToPrint} className="btn-signal">
            <Download className="size-4" aria-hidden="true" /> Download SVG
          </button>
          <button type="button" onClick={downloadPng} disabled={!readyToPrint || busy} className="btn-ghost">
            <Download className="size-4" aria-hidden="true" /> {busy ? "Rendering…" : "Download PNG"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          SVG is vector, including the QR modules, and carries physical dimensions so print shops can cut to size. The
          outer shape path is the cut line. Colors are RGB; ask your printer to convert to their profile. Fonts are system
          fonts so the file renders the same anywhere.
        </p>
        {status === "block" && <p className="mt-2 text-xs text-destructive">Downloads are disabled until the blocking issues above are fixed.</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">Layout {layout.width}×{layout.height} units.</p>
      </section>
    </div>
  );
}

function Dot({ level }: { level: CheckLevel }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mt-1.5 inline-block size-2 shrink-0 rounded-full", level === "ok" ? "bg-emerald-400" : level === "warn" ? "bg-amber-300" : "bg-destructive")}
    />
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 p-2">
      <dt className="label-tech text-[10px]">{label}</dt>
      <dd className="font-display text-base font-bold tabular-nums">{value}</dd>
    </div>
  );
}

"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { canvasToPngBlob, downloadBlob, rasterizeSvg } from "@/lib/tag/export";

interface Props {
  code: string;
  status: "active" | "disabled";
  url: string;
  svg: string;
  scanCount: number;
  lastScannedAt: string | null;
}

/** Plain QR (no decal styling) with the permanent code and quick downloads. */
export function QrPanel({ code, status, url, svg, scanCount, lastScannedAt }: Props) {
  const downloadSvg = () => {
    const withSize = svg.replace(/width="\d+" height="\d+"/, 'width="2in" height="2in"');
    downloadBlob(new Blob([withSize], { type: "image/svg+xml" }), `buildtag-${code}.svg`);
  };

  const downloadPng = async () => {
    try {
      const canvas = await rasterizeSvg(svg, 1200, 1200, "#ffffff");
      downloadBlob(await canvasToPngBlob(canvas), `buildtag-${code}.png`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export PNG");
    }
  };

  return (
    <div className="panel p-5 sm:p-6">
      <p className="eyebrow">Permanent QR</p>
      <div className="mt-4 overflow-hidden rounded-md bg-white p-3" dangerouslySetInnerHTML={{ __html: svg.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"') }} />
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-2xl tracking-[0.2em]">{code}</span>
        <span className={`label-tech ${status === "disabled" ? "text-destructive" : "text-emerald-400"}`}>{status}</span>
      </div>
      <p className="mt-2 break-all text-xs text-muted-foreground">{url}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast.success("Scan URL copied");
          }}
          className="btn-ghost btn-small"
        >
          <Copy className="size-3.5" aria-hidden="true" /> Copy
        </button>
        <button type="button" onClick={downloadSvg} className="btn-ghost btn-small">
          <Download className="size-3.5" aria-hidden="true" /> SVG
        </button>
        <button type="button" onClick={downloadPng} className="btn-ghost btn-small">
          <Download className="size-3.5" aria-hidden="true" /> PNG
        </button>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-surface-2 p-3">
          <dt className="label-tech">Scans</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{scanCount}</dd>
        </div>
        <div className="rounded-md bg-surface-2 p-3">
          <dt className="label-tech">Last scan</dt>
          <dd className="text-sm">{lastScannedAt ? new Date(lastScannedAt).toLocaleDateString() : "Never"}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        This code never changes. Rename the build, change your username or move the car to a new owner and every printed
        decal keeps working.
      </p>
    </div>
  );
}

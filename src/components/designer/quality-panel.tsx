"use client";

import { RefreshCw } from "lucide-react";

import { QUALITY_LABEL, type SafetyReport } from "@/lib/qr/safety";
import { cn } from "@/lib/utils";

import type { DecodeState } from "./tag-designer";

/**
 * Scan quality (heuristic) and the real decoder result, kept visibly
 * separate: the heuristic explains, the decoder validates.
 */
export function QualityPanel({ safety, decode, onRetest }: { safety: SafetyReport; decode: DecodeState; onRetest: () => void }) {
  const color = safety.quality === "invalid" ? "text-destructive" : safety.quality === "risky" ? "text-neon-amber" : safety.quality === "good" ? "text-neon-cyan" : "text-emerald-400";

  return (
    <section className="panel p-4">
      <p className="label-tech">Scan quality (design check)</p>
      <p className={cn("mt-1 font-display text-3xl font-bold uppercase", color)}>{QUALITY_LABEL[safety.quality]}</p>
      <ul className="mt-2 space-y-1 text-xs">
        {safety.checks.map((c) => (
          <li key={c.id} className="flex gap-2">
            <span className={cn("shrink-0 font-bold", c.level === "pass" ? "text-emerald-400" : c.level === "warn" ? "text-neon-amber" : "text-destructive")}>{c.level === "pass" ? "✓" : "⚠"}</span>
            <span>
              <span className="text-foreground">{c.label}.</span> <span className="text-muted-foreground">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <p className="label-tech">Decoder test</p>
        <button type="button" onClick={onRetest} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className={cn("size-3", decode.status === "testing" && "animate-spin")} aria-hidden="true" /> Re-run
        </button>
      </div>
      <p className={cn("mt-1 font-display text-xl font-bold uppercase", decode.status === "pass" ? "text-emerald-400" : decode.status === "fail" ? "text-destructive" : "text-muted-foreground")}>
        {decode.status === "pass" ? "Validated" : decode.status === "fail" ? "Failed validation" : "Testing…"}
      </p>
      <p className="text-xs text-muted-foreground">
        {decode.status === "pass"
          ? `The rendered export decoded to your scan URL at ${decode.results.map((r) => r.widthPx).join(", ")} px.`
          : decode.status === "fail"
            ? `Could not read the rendered artwork at ${decode.results.filter((r) => !r.ok).map((r) => r.widthPx).join(", ")} px. Increase size, simplify the QR style, or fix contrast.`
            : "Rendering the export and reading it back with a QR decoder."}
      </p>
    </section>
  );
}

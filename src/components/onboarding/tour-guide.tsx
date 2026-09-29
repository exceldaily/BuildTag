"use client";

import { Compass, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { TOUR_TOTAL_STEPS, guideStepForPath, readTourState, serverTourState, subscribeTour, writeTourState, type GuideTipKey } from "@/lib/onboarding";

export interface TourGuideLabels {
  step: string; // "Step {n} of {total}"
  skipGuide: string;
  gotIt: string;
  finish: string;
  tips: Record<GuideTipKey, string>;
}

/**
 * The guide bar: while the walkthrough is active it follows the member from
 * screen to screen with one tip for the screen they are on. "Got it" hides
 * the tip for that screen, "Skip guide" ends the walkthrough for good.
 */
export function TourGuide({ labels }: { labels: TourGuideLabels }) {
  const pathname = usePathname();
  const active = useSyncExternalStore(subscribeTour, readTourState, serverTourState) === "active";
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);

  const step = guideStepForPath(pathname);
  if (!active || !step || hiddenFor === pathname) return null;

  const end = () => writeTourState("done");

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl border border-signal/60 bg-background/95 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur md:inset-x-auto md:right-6 md:bottom-6 md:w-[26rem]"
    >
      <div className="flex items-start gap-3 p-4">
        <Compass className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.16em] text-signal uppercase">
            {labels.step.replace("{n}", String(step.step)).replace("{total}", String(TOUR_TOTAL_STEPS))}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">{labels.tips[step.tip]}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {step.last ? (
              <button type="button" onClick={end} className="btn-signal btn-small">
                {labels.finish}
              </button>
            ) : (
              <button type="button" onClick={() => setHiddenFor(pathname)} className="btn-ghost btn-small">
                {labels.gotIt}
              </button>
            )}
            {!step.last && (
              <button type="button" onClick={end} className="inline-flex h-9 items-center px-2 font-display text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground">
                {labels.skipGuide}
              </button>
            )}
          </div>
        </div>
        <button type="button" onClick={() => setHiddenFor(pathname)} aria-label={labels.gotIt} className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="h-0.5 bg-line" aria-hidden="true">
        <div className="h-full bg-signal transition-[width]" style={{ width: `${(step.step / TOUR_TOTAL_STEPS) * 100}%` }} />
      </div>
    </aside>
  );
}

"use client";

import { Camera, Car, ChevronLeft, ChevronRight, Gauge, QrCode, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { readTourState, serverTourState, subscribeTour, writeTourState } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

export interface WelcomeTourLabels {
  skip: string;
  next: string;
  back: string;
  start: string;
  replay: string;
  slides: { title: string; body: string }[];
}

/**
 * First-run intro: four cards a new member flips through (swipe, arrows or
 * the buttons), then lands on the Add vehicle screen with the guide bar on.
 * Skip is always one tap away, and nothing here touches account data.
 */
export function WelcomeTour({ autoStart, labels, decalSrc }: { autoStart: boolean; labels: WelcomeTourLabels; decalSrc: string }) {
  const router = useRouter();
  const state = useSyncExternalStore(subscribeTour, readTourState, serverTourState);
  // null = follow the automatic rule; true/false = the member opened or closed it.
  const [manual, setManual] = useState<boolean | null>(null);
  // Automatic only for members who have not seen or skipped it on this device.
  const open = manual ?? (autoStart && state === null);
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const count = labels.slides.length;

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(count - 1, i));
      const el = track.current;
      if (el) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({ left: next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
      }
      setIndex(next);
    },
    [count],
  );

  const skip = useCallback(() => {
    writeTourState("done");
    setManual(false);
  }, []);

  const start = useCallback(() => {
    writeTourState("active");
    setManual(false);
    router.push("/dashboard/vehicles/new");
  }, [router]);

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, index, go, skip]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setManual(true);
        }}
        className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline"
      >
        {labels.replay}
      </button>
    );
  }

  const last = index === count - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={labels.slides[index]?.title}
        tabIndex={-1}
        className="relative flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden border border-line bg-background outline-none sm:rounded-sm"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-signal uppercase">
            <span className="text-foreground/45">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </p>
          <button type="button" onClick={skip} className="inline-flex h-9 items-center gap-1.5 px-2 font-display text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground">
            {labels.skip} <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Swipeable track: native scroll-snap, so touch flips feel right. */}
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
            if (i !== index) setIndex(i);
          }}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {labels.slides.map((s, i) => (
            <section key={s.title} aria-hidden={i !== index} className="w-full shrink-0 snap-center px-5 pt-4 pb-2">
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden border border-line bg-[#0a0813]">
                <div className="eng-paper absolute inset-0 opacity-60" aria-hidden="true" />
                <SlideArt index={i} decalSrc={decalSrc} />
              </div>
              <h2 className="mt-5 text-3xl leading-none sm:text-4xl">
                <span className="speed-heading">{s.title}</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {labels.slides.map((s, i) => (
              <span key={s.title} className={cn("h-1.5 transition-all", i === index ? "w-6 bg-signal" : "w-1.5 bg-foreground/25")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={() => go(index - 1)} className="btn-ghost btn-small">
                <ChevronLeft className="size-4" aria-hidden="true" /> {labels.back}
              </button>
            )}
            {last ? (
              <button type="button" onClick={start} className="btn-signal">
                {labels.start}
              </button>
            ) : (
              <button type="button" onClick={() => go(index + 1)} className="btn-signal">
                {labels.next} <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small spec-sheet illustrations. Decorative only. */
function SlideArt({ index, decalSrc }: { index: number; decalSrc: string }) {
  if (index === 0) {
    return (
      <div className="relative flex items-center gap-5" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={decalSrc} alt="" className="w-28 rotate-[-4deg] drop-shadow-[0_14px_20px_rgba(0,0,0,0.7)] sm:w-32" />
        <span className="h-px w-10 border-t border-dashed border-signal" />
        <span className="flex h-24 w-14 flex-col items-center justify-center gap-1.5 rounded-md border border-foreground/30 bg-background sm:h-28 sm:w-16">
          <QrCode className="size-6 text-signal" />
          <span className="h-1 w-8 bg-foreground/30" />
          <span className="h-1 w-6 bg-foreground/20" />
        </span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="relative w-[70%] space-y-2.5" aria-hidden="true">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-signal uppercase">
          <Car className="size-4" /> Vehicle
        </div>
        {["2022", "Toyota", "GR Supra"].map((v) => (
          <div key={v} className="flex h-8 items-center border border-line bg-background px-3 text-sm text-foreground/85">
            {v}
          </div>
        ))}
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="relative grid w-[78%] grid-cols-3 gap-3" aria-hidden="true">
        {(
          [
            [Camera, "Photos"],
            [Gauge, "Power"],
            [Wrench, "Mods"],
          ] as const
        ).map(([Icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-2 border border-line bg-background py-4">
            <Icon className="size-6 text-signal" />
            <span className="font-mono text-[10px] tracking-[0.14em] text-foreground/70 uppercase">{label}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={decalSrc} alt="" aria-hidden="true" className="relative h-[78%] w-auto drop-shadow-[0_18px_26px_rgba(0,0,0,0.75)]" />
  );
}

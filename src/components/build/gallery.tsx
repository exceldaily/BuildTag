"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { photoUrl } from "@/lib/storage";
import type { PublicPhoto } from "@/lib/types";

/**
 * Mobile-first gallery: horizontal snap scroller of lazy thumbnails, tap to
 * open a full-screen viewer with swipe/keyboard navigation.
 */
export function Gallery({ photos, title }: { photos: PublicPhoto[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? null : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, step]);

  return (
    <>
      <ul className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 md:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.storage_path} className="w-[78%] shrink-0 snap-center sm:w-auto">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="block aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:outline-none"
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.storage_path, "thumb")} alt={p.alt_text || `${title} photo ${i + 1}`} loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {index !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
            <span>
              {index + 1} / {photos.length}
            </span>
            <button type="button" onClick={close} className="inline-flex size-10 items-center justify-center rounded-md hover:bg-white/10" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center px-2"
            onTouchStart={(e) => {
              (e.currentTarget as HTMLDivElement).dataset.x = String(e.touches[0].clientX);
            }}
            onTouchEnd={(e) => {
              const start = Number((e.currentTarget as HTMLDivElement).dataset.x ?? 0);
              const dx = e.changedTouches[0].clientX - start;
              if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(photos[index].storage_path, "full")} alt={photos[index].alt_text || `${title} photo ${index + 1}`} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <button type="button" onClick={() => step(-1)} className="btn-ghost btn-small">
              Prev
            </button>
            {photos[index].caption && <p className="px-3 text-center text-sm text-white/80">{photos[index].caption}</p>}
            <button type="button" onClick={() => step(1)} className="btn-ghost btn-small">
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

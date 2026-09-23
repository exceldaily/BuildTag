"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { ModCategory } from "@/lib/types";

interface PartHit {
  id: string;
  brand: string;
  name: string;
  slug: string;
  category: ModCategory;
  part_number: string | null;
}

/**
 * Part-name input with suggestions from the standardized parts catalog.
 * Suggestions are optional: typing anything custom works exactly the same.
 */
export function PartSuggest({
  inputRef,
  id,
  placeholder,
  onPick,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  id: string;
  placeholder?: string;
  onPick: (part: PartHit) => void;
}) {
  const [hits, setHits] = useState<PartHit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/parts/suggest?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { parts: PartHit[] };
        setHits(data.parts ?? []);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 250);
  };

  return (
    <div className="relative">
      <input
        id={id}
        ref={inputRef}
        placeholder={placeholder}
        autoComplete="off"
        required
        maxLength={120}
        className="field"
        onChange={(e) => search(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-autocomplete="list"
      />
      {open && hits.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-20 mt-1 max-h-56 overflow-auto rounded-md border border-line bg-popover p-1 shadow-xl" role="listbox">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(h);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-white/5"
              >
                <span>
                  <span className="text-foreground/70">{h.brand}</span> {h.name}
                </span>
                <span className="text-xs text-muted-foreground">Catalog part</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteTagDesignAction, duplicateTagDesignAction } from "@/lib/actions/designs";
import { SHAPES, STYLES, TEMPLATES } from "@/lib/tag";
import type { TagDesignRow } from "@/lib/types";

export function SavedDesigns({ vehicleId, designs: initial }: { vehicleId: string; designs: TagDesignRow[] }) {
  const [designs, setDesigns] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <section>
      <div className="flex items-end justify-between">
        <h2 className="text-2xl">Saved designs</h2>
        <span className="label-tech">{designs.length}</span>
      </div>
      {designs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No saved designs yet. Every design you save shares the same permanent QR.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
          {designs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TEMPLATES[d.template as keyof typeof TEMPLATES]?.name ?? d.template} · {SHAPES[d.shape as keyof typeof SHAPES]?.name ?? d.shape} ·{" "}
                  {STYLES[d.style as keyof typeof STYLES]?.name ?? d.style} · {new Date(d.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Link href={`/dashboard/vehicles/${vehicleId}/tag-designer?design=${d.id}`} className="btn-ghost btn-small">
                Edit
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await duplicateTagDesignAction(d.id);
                    if (!res.ok) toast.error(res.error);
                    else setDesigns((x) => [res.data, ...x]);
                  })
                }
                className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label={`Duplicate ${d.name}`}
              >
                <Copy className="size-4" />
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete "${d.name}"?`)) return;
                  setDesigns((x) => x.filter((y) => y.id !== d.id));
                  start(async () => {
                    const res = await deleteTagDesignAction(d.id);
                    if (!res.ok) toast.error(res.error);
                  });
                }}
                className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${d.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

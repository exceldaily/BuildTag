import { ArrowUpRight } from "lucide-react";

import { MOD_CATEGORIES, MOD_CATEGORY_LABEL, type ModCategory, type PublicModification } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

/**
 * Categorized modifications. Native <details> keeps sections collapsible on
 * mobile with zero JavaScript; sections start open on larger screens via CSS.
 */
export function ModificationsList({ slug, modifications }: { slug: string; modifications: PublicModification[] }) {
  if (modifications.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">No modifications listed yet. Stock for now.</p>;
  }

  const grouped = new Map<ModCategory, PublicModification[]>();
  for (const m of modifications) {
    const list = grouped.get(m.category) ?? [];
    list.push(m);
    grouped.set(m.category, list);
  }
  const ordered = MOD_CATEGORIES.filter((c) => grouped.has(c.value));

  return (
    <div className="mt-4 divide-y divide-line rounded-lg border border-line">
      {ordered.map((cat, idx) => {
        const items = grouped.get(cat.value)!;
        return (
          <details key={cat.value} open={idx < 3} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 select-none [&::-webkit-details-marker]:hidden">
              <h3 className="text-xl">{MOD_CATEGORY_LABEL[cat.value]}</h3>
              <span className="flex items-center gap-3">
                <span className="label-tech">{items.length}</span>
                <svg className="size-4 text-muted-foreground transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <ul className="border-t border-line bg-surface">
              {items.map((m) => (
                <li key={m.public_id} className="flex items-start justify-between gap-4 border-b border-line/60 px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {m.brand && <span className="text-foreground/70">{m.brand} </span>}
                      {m.part_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[m.part_number ? `#${m.part_number}` : null, m.price !== null ? formatMoney(m.price) : null, m.shop ? `Installed by ${m.shop.name}` : m.installed_by_text ? `Installed by ${m.installed_by_text}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {m.description && <p className="mt-1 text-sm text-foreground/75">{m.description}</p>}
                  </div>
                  {m.has_link && (
                    <a
                      href={`/out/${slug}/part/${m.public_id}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2.5 py-1.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:border-foreground/40 hover:bg-white/5"
                    >
                      View part
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

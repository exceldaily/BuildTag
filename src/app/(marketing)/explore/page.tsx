import type { Metadata } from "next";
import Link from "next/link";

import { exploreBuilds, listPublicMakes, type ExploreSort } from "@/lib/db/public";
import { BuildCard } from "@/components/build/build-card";

export const metadata: Metadata = {
  title: "Explore builds",
  description: "Browse public BuildTag builds by make, model and power.",
  alternates: { canonical: "/explore" },
};

export const dynamic = "force-dynamic";

const SORTS: { value: ExploreSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "scanned", label: "Most scanned" },
  { value: "liked", label: "Most liked" },
  { value: "power", label: "Most power" },
];

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function toInt(v: string): number | undefined {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const make = first(sp.make).slice(0, 60);
  const model = first(sp.model).slice(0, 60);
  const minHp = toInt(first(sp.min_hp));
  const maxHp = toInt(first(sp.max_hp));
  const sortRaw = first(sp.sort) as ExploreSort;
  const sort: ExploreSort = SORTS.some((s) => s.value === sortRaw) ? sortRaw : "newest";
  const page = Math.max(1, toInt(first(sp.page)) ?? 1);

  const [result, makes] = await Promise.all([
    exploreBuilds({ make, model, minHp, maxHp, sort, page }),
    listPublicMakes(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const query = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { make, model, min_hp: minHp, max_hp: maxHp, sort, page, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && !(k === "page" && v === 1) && !(k === "sort" && v === "newest")) params.set(k, String(v));
    }
    const s = params.toString();
    return `/explore${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <p className="eyebrow">Explore</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Public builds</h1>

      <form className="mt-8 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_120px_120px_160px_auto]" action="/explore" method="get">
        <div>
          <label htmlFor="make" className="field-label">
            Make
          </label>
          <input id="make" name="make" list="makes" defaultValue={make} placeholder="Any make" className="field" />
          <datalist id="makes">
            {makes.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="model" className="field-label">
            Model
          </label>
          <input id="model" name="model" defaultValue={model} placeholder="Any model" className="field" />
        </div>
        <div>
          <label htmlFor="min_hp" className="field-label">
            Min HP
          </label>
          <input id="min_hp" name="min_hp" type="number" inputMode="numeric" min={0} defaultValue={minHp ?? ""} className="field" />
        </div>
        <div>
          <label htmlFor="max_hp" className="field-label">
            Max HP
          </label>
          <input id="max_hp" name="max_hp" type="number" inputMode="numeric" min={0} defaultValue={maxHp ?? ""} className="field" />
        </div>
        <div>
          <label htmlFor="sort" className="field-label">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="field">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-ghost w-full">
            Filter
          </button>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {result.total === 0 ? "No builds match those filters yet." : `${result.total} build${result.total === 1 ? "" : "s"}`}
      </p>

      {result.builds.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.builds.map((b) => (
            <BuildCard key={b.slug} build={b} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
          {page > 1 && (
            <Link href={query({ page: page - 1 })} className="btn-ghost btn-small">
              Previous
            </Link>
          )}
          <span className="label-tech">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={query({ page: page + 1 })} className="btn-ghost btn-small">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

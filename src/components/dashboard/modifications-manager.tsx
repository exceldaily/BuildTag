"use client";

import { Eye, EyeOff, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addModificationAction,
  deleteModificationAction,
  reorderModificationsAction,
  setModificationHiddenAction,
  updateModificationAction,
} from "@/lib/actions/modifications";
import { MOD_CATEGORIES, MOD_CATEGORY_LABEL, SOURCE_BADGE, type ModCategory, type ModificationRow, type ShopRow } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { EarnBadge, EarnBlock, MonetizeSummary } from "./affiliate-panel";
import { PartSuggest } from "./part-suggest";
import { SortableItem, SortableList } from "./sortable";

type Shop = ShopRow;

interface Props {
  vehicleId: string;
  modifications: ModificationRow[];
  shops: Shop[];
  /** The business the signed-in user is working for on this (unclaimed) build. Null for the owner. */
  actingOrg?: { id: string; name: string } | null;
}

/** A part recorded by a business is read-only for everyone outside that business. */
function lockedFor(mod: ModificationRow, actingOrg: Props["actingOrg"]) {
  return mod.created_by_organization_id !== null && mod.created_by_organization_id !== actingOrg?.id;
}

/**
 * Fast entry: category + part name (+ brand) adds instantly and keeps focus
 * in the part-name field so a whole build can be typed in one sitting.
 * Everything else lives in the edit dialog.
 */
export function ModificationsManager({ vehicleId, modifications: initial, shops, actingOrg = null }: Props) {
  const [mods, setMods] = useState(initial);
  const [category, setCategory] = useState<ModCategory>("engine");
  const [editing, setEditing] = useState<ModificationRow | null>(null);
  const [pending, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    const map = new Map<ModCategory, ModificationRow[]>();
    for (const m of mods) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return MOD_CATEGORIES.filter((c) => map.has(c.value)).map((c) => ({ category: c.value, items: map.get(c.value)! }));
  }, [mods]);

  const quickAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) return;
    const form = new FormData();
    form.set("quick", "1");
    form.set("category", category);
    form.set("part_name", name);
    form.set("brand", brandRef.current?.value.trim() ?? "");
    if (nameRef.current) nameRef.current.value = "";
    if (brandRef.current) brandRef.current.value = "";
    nameRef.current?.focus();
    start(async () => {
      const res = await addModificationAction(vehicleId, form);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setMods((m) => [...m, res.data]);
    });
  };

  const remove = (mod: ModificationRow) => {
    if (!window.confirm(`Remove ${mod.part_name}?`)) return;
    setMods((m) => m.filter((x) => x.id !== mod.id));
    start(async () => {
      const res = await deleteModificationAction(mod.id);
      if (!res.ok) toast.error(res.error);
    });
  };

  const toggleHidden = (mod: ModificationRow) => {
    const hidden = !mod.is_hidden;
    setMods((m) => m.map((x) => (x.id === mod.id ? { ...x, is_hidden: hidden } : x)));
    start(async () => {
      const res = await setModificationHiddenAction(mod.id, hidden);
      if (!res.ok) {
        toast.error(res.error);
        setMods((m) => m.map((x) => (x.id === mod.id ? { ...x, is_hidden: !hidden } : x)));
        return;
      }
      toast.success(hidden ? "Hidden from your public page" : "Showing on your public page");
    });
  };

  const reorderWithin = (cat: ModCategory, next: ModificationRow[]) => {
    const others = mods.filter((m) => m.category !== cat);
    const merged = [...others, ...next];
    setMods(merged);
    start(async () => {
      // Persist a global order: keep category groups in display order.
      const ordered = MOD_CATEGORIES.flatMap((c) => merged.filter((m) => m.category === c.value)).map((m) => m.id);
      const res = await reorderModificationsAction(vehicleId, ordered);
      if (!res.ok) toast.error(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Modifications</h2>
        <span className="label-tech">{mods.length} total</span>
      </div>

      <MonetizeSummary
        mods={mods}
        onAddLink={() => {
          const next = mods.find((m) => !m.affiliate_url);
          if (next) setEditing(next);
        }}
      />

      <form onSubmit={quickAdd} className="panel grid gap-2 p-3 sm:grid-cols-[170px_1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="quick-category" className="field-label">
            Category
          </label>
          <select id="quick-category" value={category} onChange={(e) => setCategory(e.target.value as ModCategory)} className="field">
            {MOD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quick-brand" className="field-label">
            Brand <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input id="quick-brand" ref={brandRef} placeholder="Pure Turbos" autoComplete="off" className="field" />
        </div>
        <div>
          <label htmlFor="quick-name" className="field-label">
            Part name
          </label>
          <PartSuggest
            inputRef={nameRef}
            id="quick-name"
            placeholder="Pure800 turbo"
            onPick={(part) => {
              if (brandRef.current && !brandRef.current.value) brandRef.current.value = part.brand;
              if (nameRef.current) nameRef.current.value = part.name;
              setCategory(part.category);
            }}
          />
        </div>
        <button type="submit" className="btn-signal" disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </button>
        <p className="text-xs text-muted-foreground sm:col-span-4">
          {actingOrg
            ? `Parts you add here are recorded as ${actingOrg.name}'s work. The customer sees them after they claim the build and can't change them.`
            : "Press Enter to add and keep typing. Open a part to add the price, your affiliate link and the installer."}
        </p>
      </form>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing listed yet. Start with the big stuff: turbo, tune, suspension, wheels.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category: cat, items }) => (
            <section key={cat}>
              <h3 className="mb-2 font-display text-lg font-bold tracking-wider uppercase">
                {MOD_CATEGORY_LABEL[cat]} <span className="text-muted-foreground">{items.length}</span>
              </h3>
              <SortableList items={items} onReorder={(next) => reorderWithin(cat, next)}>
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {items.map((m) => (
                    <SortableItem key={m.id} id={m.id}>
                      {(handle) => (
                        <li className={cn("flex items-center gap-2 bg-surface px-2 py-2", m.is_hidden && "opacity-60")}>
                          {handle}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {m.brand && <span className="text-foreground/70">{m.brand} </span>}
                              {m.part_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[
                                m.source_type !== "owner" ? SOURCE_BADGE[m.source_type] : null,
                                m.is_hidden ? "Hidden" : null,
                                m.part_number ? `#${m.part_number}` : null,
                                m.price !== null ? `${formatMoney(m.price)}${m.price_public ? "" : " (hidden)"}` : null,
                                m.installed_by_text ||
                                  (m.installed_by_organization_id ? shops.find((s) => s.id === m.installed_by_organization_id)?.name : null),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          {lockedFor(m, actingOrg) ? (
                            <>
                              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex" title="Recorded by a business. Details stay as recorded.">
                                <Lock className="size-3.5" aria-hidden="true" />
                                Recorded
                              </span>
                              {!actingOrg && (
                                <button
                                  type="button"
                                  onClick={() => toggleHidden(m)}
                                  className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                  aria-label={m.is_hidden ? `Show ${m.part_name} on your public page` : `Hide ${m.part_name} from your public page`}
                                >
                                  {m.is_hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <EarnBadge mod={m} onAdd={() => setEditing(m)} />
                              {!actingOrg && (
                                <button
                                  type="button"
                                  onClick={() => toggleHidden(m)}
                                  className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                  aria-label={m.is_hidden ? `Show ${m.part_name} on your public page` : `Hide ${m.part_name} from your public page`}
                                >
                                  {m.is_hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              )}
                              <button type="button" onClick={() => setEditing(m)} className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground" aria-label={`Edit ${m.part_name}`}>
                                <Pencil className="size-4" />
                              </button>
                              <button type="button" onClick={() => remove(m)} className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${m.part_name}`}>
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </li>
                      )}
                    </SortableItem>
                  ))}
                </ul>
              </SortableList>
            </section>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit part</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditModForm
              mod={editing}
              shops={shops}
              business={actingOrg !== null && editing.created_by_organization_id === actingOrg.id}
              onSaved={(updated) => {
                setMods((m) => m.map((x) => (x.id === updated.id ? updated : x)));
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditModForm({
  mod,
  shops,
  business,
  onSaved,
}: {
  mod: ModificationRow;
  shops: Shop[];
  /** Editing the business's own record: installer is fixed, work order ref available. */
  business: boolean;
  onSaved: (m: ModificationRow) => void;
}) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const res = await updateModificationAction(mod.id, form);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          toast.success("Saved");
          onSaved(res.data);
        });
      }}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category" error={errors.category}>
          <select name="category" defaultValue={mod.category} className="field">
            {MOD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <input name="brand" defaultValue={mod.brand} maxLength={80} className="field" />
        </Field>
      </div>
      <Field label="Part name" error={errors.part_name}>
        <input name="part_name" defaultValue={mod.part_name} required maxLength={120} className="field" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Part number">
          <input name="part_number" defaultValue={mod.part_number} maxLength={80} className="field" />
        </Field>
        <Field label="Installed on">
          <input name="installation_date" type="date" defaultValue={mod.installation_date ?? ""} className="field" />
        </Field>
      </div>
      <Field label="Description">
        <textarea name="description" defaultValue={mod.description} maxLength={1000} rows={3} className="field-textarea min-h-20" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Price (USD)" error={errors.price}>
          <input name="price" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={mod.price ?? ""} className="field" />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" name="price_public" defaultChecked={mod.price_public} className="size-4 accent-[#ff2d7a]" />
          Show price publicly
        </label>
      </div>
      <EarnBlock mod={mod} errors={errors} />
      {business ? (
        <>
          <input type="hidden" name="installed_by_text" value={mod.installed_by_text} />
          <input type="hidden" name="installed_by_organization_id" value={mod.installed_by_organization_id ?? ""} />
          <Field label="Work order / invoice #" hint="Private to your business. Never shown publicly or to the customer.">
            <input name="work_order_reference" defaultValue={mod.work_order_reference} maxLength={80} className="field" />
          </Field>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Installed by (text)">
            <input name="installed_by_text" defaultValue={mod.installed_by_text} maxLength={120} placeholder="Self / shop name" className="field" />
          </Field>
          <Field label="Shop">
            <select name="installed_by_organization_id" defaultValue={mod.installed_by_organization_id ?? ""} className="field">
              <option value="">None</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.verified_status === "verified" ? " ✓" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <input type="hidden" name="part_id" value={mod.part_id ?? ""} />
      <button type="submit" className="btn-signal w-full" disabled={pending}>
        {pending ? "Saving…" : "Save part"}
      </button>
    </form>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

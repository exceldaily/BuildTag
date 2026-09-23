"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteVehicleAction, saveSettingsAction } from "@/lib/actions/vehicles";
import type { VehicleRow } from "@/lib/types";
import { SaveIndicator, useAutosave } from "@/components/dashboard/use-autosave";

export function SettingsForm({ vehicle, siteUrl }: { vehicle: VehicleRow; siteUrl: string }) {
  const [slug, setSlug] = useState(vehicle.slug);
  const action = useCallback((form: FormData) => saveSettingsAction(vehicle.id, form), [vehicle.id]);
  const { formRef, state, error, fieldErrors, schedule, saveNow } = useAutosave(action, {
    onSaved: (v) => setSlug(v.slug),
  });
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-10">
      <form
        ref={formRef}
        onChange={schedule}
        onBlur={() => state === "dirty" && void saveNow()}
        onSubmit={(e) => {
          e.preventDefault();
          void saveNow();
        }}
        className="space-y-5"
        noValidate
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Settings</h2>
          <SaveIndicator state={state} error={error} />
        </div>

        <fieldset>
          <legend className="field-label">Visibility</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { v: "public", t: "Public", d: "Listed in Explore and indexable by search engines." },
              { v: "unlisted", t: "Unlisted", d: "Anyone with the link or the decal can view. Not listed, not indexed." },
              { v: "private", t: "Private", d: "Only you. Scans show a private notice." },
            ].map((o) => (
              <label key={o.v} className="flex cursor-pointer gap-3 rounded-md border border-line p-3 has-checked:border-signal">
                <input type="radio" name="visibility" value={o.v} defaultChecked={vehicle.visibility === o.v} className="mt-1 accent-[#e4162b]" />
                <span>
                  <span className="block font-display text-sm font-bold tracking-wider uppercase">{o.t}</span>
                  <span className="block text-xs text-muted-foreground">{o.d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-3 rounded-md border border-line px-4 py-3 text-sm">
          <input type="checkbox" name="show_owner_section" defaultChecked={vehicle.show_owner_section} className="size-4 accent-[#e4162b]" />
          Show the owner section (your name, bio and personal socials) on this build
        </label>

        <div>
          <label htmlFor="slug" className="field-label">
            Build URL
          </label>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{siteUrl}/build/</span>
            <input id="slug" name="slug" defaultValue={vehicle.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={80} className="field font-mono" />
          </div>
          {fieldErrors.slug ? (
            <p className="field-error">{fieldErrors.slug}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Current: {siteUrl}/build/{slug}. Changing this never breaks your decal: the QR resolves to whatever the URL is now.
            </p>
          )}
        </div>
        <button type="submit" className="btn-ghost btn-small">
          Save now
        </button>
      </form>

      <section className="rounded-lg border border-destructive/40 p-5">
        <h2 className="text-2xl text-destructive">Danger zone</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deleting this vehicle removes its photos, modifications, designs and analytics. Its permanent code stops
          resolving. This cannot be undone.
        </p>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (!window.confirm(`Delete ${vehicle.nickname || vehicle.model}? This cannot be undone.`)) return;
            startDelete(async () => {
              const res = await deleteVehicleAction(vehicle.id);
              if (res && !res.ok) toast.error(res.error);
            });
          }}
          className="btn-ghost btn-small mt-4 border-destructive/60 text-destructive hover:bg-destructive/10"
        >
          {deleting ? "Deleting…" : "Delete vehicle"}
        </button>
      </section>
    </div>
  );
}

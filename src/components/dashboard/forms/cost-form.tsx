"use client";

import { useCallback } from "react";

import { saveCostAction } from "@/lib/actions/vehicles";
import type { VehicleRow } from "@/lib/types";
import { SaveIndicator, useAutosave } from "@/components/dashboard/use-autosave";

export function CostForm({ vehicle, modTotal }: { vehicle: VehicleRow; modTotal: number }) {
  const action = useCallback((form: FormData) => saveCostAction(vehicle.id, form), [vehicle.id]);
  const { formRef, state, error, fieldErrors, schedule, saveNow } = useAutosave(action);

  return (
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
        <h2 className="text-2xl">Build cost</h2>
        <SaveIndicator state={state} error={error} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="build_cost" className="field-label">
            Total build cost (USD)
          </label>
          <input id="build_cost" name="build_cost" type="number" inputMode="decimal" min={0} step="1" placeholder="26420" defaultValue={vehicle.build_cost ?? ""} className="field" />
          {fieldErrors.build_cost && <p className="field-error">{fieldErrors.build_cost}</p>}
          {modTotal > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Your listed part prices add up to ${modTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}.
            </p>
          )}
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 rounded-md border border-line px-4 py-3 text-sm">
            <input type="checkbox" name="build_cost_public" defaultChecked={vehicle.build_cost_public} className="size-4 accent-[#e4162b]" />
            Show the total on the public build page
          </label>
        </div>
      </div>
      <button type="submit" className="btn-ghost btn-small">
        Save now
      </button>
    </form>
  );
}

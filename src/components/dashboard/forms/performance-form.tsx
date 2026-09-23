"use client";

import { useCallback } from "react";

import { savePerformanceAction } from "@/lib/actions/vehicles";
import type { VehicleRow } from "@/lib/types";
import { SaveIndicator, useAutosave } from "@/components/dashboard/use-autosave";

const currentYear = new Date().getFullYear();

export function PerformanceForm({ vehicle, compact = false }: { vehicle: VehicleRow; compact?: boolean }) {
  const action = useCallback((form: FormData) => savePerformanceAction(vehicle.id, form), [vehicle.id]);
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
        <h2 className="text-2xl">Performance</h2>
        <SaveIndicator state={state} error={error} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="horsepower" className="field-label">
            Power
          </label>
          <div className="flex gap-2">
            <input id="horsepower" name="horsepower" type="number" inputMode="numeric" min={0} max={10000} placeholder="612" defaultValue={vehicle.horsepower ?? ""} className="field" />
            <select name="horsepower_type" defaultValue={vehicle.horsepower_type} className="field w-28" aria-label="Power unit">
              <option value="WHP">WHP</option>
              <option value="HP">HP</option>
            </select>
          </div>
          {fieldErrors.horsepower && <p className="field-error">{fieldErrors.horsepower}</p>}
        </div>
        <div>
          <label htmlFor="torque" className="field-label">
            Torque
          </label>
          <div className="flex gap-2">
            <input id="torque" name="torque" type="number" inputMode="numeric" min={0} max={20000} placeholder="574" defaultValue={vehicle.torque ?? ""} className="field" />
            <select name="torque_unit" defaultValue={vehicle.torque_unit} className="field w-28" aria-label="Torque unit">
              <option value="LB_FT">LB-FT</option>
              <option value="NM">NM</option>
            </select>
          </div>
          {fieldErrors.torque && <p className="field-error">{fieldErrors.torque}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mileage" className="field-label">
            Mileage
          </label>
          <div className="flex gap-2">
            <input id="mileage" name="mileage" type="number" inputMode="numeric" min={0} placeholder="24000" defaultValue={vehicle.mileage ?? ""} className="field" />
            <select name="mileage_unit" defaultValue={vehicle.mileage_unit} className="field w-28" aria-label="Mileage unit">
              <option value="MI">MI</option>
              <option value="KM">KM</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="dyno_type" className="field-label">
            Dyno <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input id="dyno_type" name="dyno_type" maxLength={60} placeholder="Mustang MD-AWD-500" defaultValue={vehicle.dyno_type} className="field" />
        </div>
      </div>
      {!compact && (
        <div className="max-w-xs">
          <label htmlFor="build_started_year" className="field-label">
            Build started
          </label>
          <input id="build_started_year" name="build_started_year" type="number" inputMode="numeric" min={1900} max={currentYear + 2} placeholder="2022" defaultValue={vehicle.build_started_year ?? ""} className="field" />
        </div>
      )}
      <button type="submit" className="btn-ghost btn-small">
        Save now
      </button>
    </form>
  );
}

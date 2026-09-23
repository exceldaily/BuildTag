"use client";

import { useCallback } from "react";

import { saveOverviewAction } from "@/lib/actions/vehicles";
import type { VehicleRow } from "@/lib/types";
import { SaveIndicator, useAutosave } from "@/components/dashboard/use-autosave";

const currentYear = new Date().getFullYear();

export function OverviewForm({ vehicle }: { vehicle: VehicleRow }) {
  const action = useCallback((form: FormData) => saveOverviewAction(vehicle.id, form), [vehicle.id]);
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
        <h2 className="text-2xl">Overview</h2>
        <SaveIndicator state={state} error={error} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div>
          <label htmlFor="year" className="field-label">
            Year
          </label>
          <input id="year" name="year" type="number" inputMode="numeric" min={1900} max={currentYear + 2} defaultValue={vehicle.year ?? ""} className="field" />
          {fieldErrors.year && <p className="field-error">{fieldErrors.year}</p>}
        </div>
        <div>
          <label htmlFor="make" className="field-label">
            Make
          </label>
          <input id="make" name="make" required maxLength={60} defaultValue={vehicle.make} className="field" />
          {fieldErrors.make && <p className="field-error">{fieldErrors.make}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="model" className="field-label">
            Model
          </label>
          <input id="model" name="model" required maxLength={60} defaultValue={vehicle.model} className="field" />
          {fieldErrors.model && <p className="field-error">{fieldErrors.model}</p>}
        </div>
        <div>
          <label htmlFor="trim" className="field-label">
            Trim
          </label>
          <input id="trim" name="trim" maxLength={60} defaultValue={vehicle.trim} className="field" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nickname" className="field-label">
            Nickname
          </label>
          <input id="nickname" name="nickname" maxLength={40} defaultValue={vehicle.nickname} className="field" />
        </div>
        <div>
          <label htmlFor="location_text" className="field-label">
            Location <span className="normal-case tracking-normal">(general, optional)</span>
          </label>
          <input id="location_text" name="location_text" maxLength={80} placeholder="Orlando, FL" defaultValue={vehicle.location_text} className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="field-label">
          About the build
        </label>
        <textarea id="description" name="description" maxLength={3000} rows={7} defaultValue={vehicle.description} placeholder="What is this build about? Goals, story, what's next." className="field-textarea" />
        {fieldErrors.description && <p className="field-error">{fieldErrors.description}</p>}
      </div>
      <button type="submit" className="btn-ghost btn-small">
        Save now
      </button>
    </form>
  );
}

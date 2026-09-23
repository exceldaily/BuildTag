"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setVehicleStatusAction, updateReportAction } from "@/lib/actions/admin";
import type { ReportStatus } from "@/lib/types";

export function ReportActions({ reportId, status, vehicleId, vehicleStatus }: { reportId: string; status: ReportStatus; vehicleId: string | null; vehicleStatus: "active" | "disabled" | null }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const update = (next: ReportStatus) =>
    start(async () => {
      const res = await updateReportAction(reportId, next, note);
      if (!res.ok) toast.error(res.error);
      else toast.success(`Marked ${next}`);
    });

  return (
    <div className="flex flex-col gap-2 md:w-64">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Admin note" maxLength={1000} className="field h-9 text-xs" aria-label="Admin note" />
      <div className="flex flex-wrap gap-1.5">
        {status !== "reviewing" && (
          <button type="button" disabled={pending} onClick={() => update("reviewing")} className="btn-ghost btn-small">
            Reviewing
          </button>
        )}
        {status !== "resolved" && (
          <button type="button" disabled={pending} onClick={() => update("resolved")} className="btn-ghost btn-small border-emerald-500/60 text-emerald-400">
            Resolve
          </button>
        )}
        {status !== "dismissed" && (
          <button type="button" disabled={pending} onClick={() => update("dismissed")} className="btn-ghost btn-small">
            Dismiss
          </button>
        )}
        {vehicleId && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const next = vehicleStatus === "active" ? "disabled" : "active";
                const res = await setVehicleStatusAction(vehicleId, next);
                if (!res.ok) toast.error(res.error);
                else toast.success(`Build ${next}`);
              })
            }
            className={`btn-ghost btn-small ${vehicleStatus === "active" ? "border-destructive/60 text-destructive" : ""}`}
          >
            {vehicleStatus === "active" ? "Disable build" : "Restore build"}
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setQrStatusAction, setVehicleStatusAction } from "@/lib/actions/admin";
import type { QrCodeRow } from "@/lib/types";

export function AdminVehicleActions({ vehicleId, status: initialStatus, qr }: { vehicleId: string; status: "active" | "disabled"; qr: Pick<QrCodeRow, "id" | "code" | "status"> | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [qrStatus, setQrStatus] = useState(qr?.status ?? "active");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const next = status === "active" ? "disabled" : "active";
            const res = await setVehicleStatusAction(vehicleId, next);
            if (!res.ok) toast.error(res.error);
            else {
              setStatus(next);
              toast.success(`Build ${next}`);
            }
          })
        }
        className={`btn-ghost btn-small ${status === "active" ? "border-destructive/60 text-destructive" : "border-emerald-500/60 text-emerald-400"}`}
      >
        {status === "active" ? "Disable build" : "Restore build"}
      </button>
      {qr && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const next = qrStatus === "active" ? "disabled" : "active";
              const res = await setQrStatusAction(qr.id, next);
              if (!res.ok) toast.error(res.error);
              else {
                setQrStatus(next);
                toast.success(`QR ${next}`);
              }
            })
          }
          className={`btn-ghost btn-small ${qrStatus === "active" ? "border-destructive/60 text-destructive" : "border-emerald-500/60 text-emerald-400"}`}
        >
          {qrStatus === "active" ? "Disable QR" : "Restore QR"}
        </button>
      )}
    </div>
  );
}

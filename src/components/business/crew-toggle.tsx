"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { associateBuildAction, removeCrewBuildAction } from "@/lib/actions/business";

/** Add or remove one build from the business crew. */
export function CrewToggle({ orgId, crew, vehicleId, inCrew }: { orgId: string; crew: { id: string; name: string }; vehicleId: string; inCrew: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost btn-small"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = inCrew ? await removeCrewBuildAction(crew.id, vehicleId) : await associateBuildAction(orgId, vehicleId);
          if (!res.ok) toast.error(res.error);
          else toast.success(inCrew ? `Removed from ${crew.name}` : `Added to ${crew.name}`);
        })
      }
    >
      {inCrew ? `Remove from ${crew.name}` : `Add to ${crew.name}`}
    </button>
  );
}

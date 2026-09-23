import type { Metadata } from "next";

import { PLAN_LIMITS, getUserPlan } from "@/lib/db/plan";
import { listGarage } from "@/lib/db/vehicles";
import { requireProfile } from "@/lib/supabase/server";
import { NewVehicleForm } from "@/components/dashboard/new-vehicle-form";
import { WizardSteps } from "@/components/dashboard/wizard-steps";

export const metadata: Metadata = { title: "Add vehicle", robots: { index: false } };

export default async function NewVehiclePage() {
  const { client, user } = await requireProfile("/dashboard/vehicles/new");
  const [vehicles, plan] = await Promise.all([listGarage(client, user.id), getUserPlan(client, user.id)]);
  const limit = PLAN_LIMITS[plan].vehicles;

  return (
    <div className="mx-auto max-w-2xl">
      <WizardSteps current="vehicle" />
      <p className="eyebrow mt-8">Step 1 of 6</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Your vehicle</h1>
      <p className="mt-2 text-sm text-muted-foreground">Year, make and model are enough to start. You can change everything later.</p>
      {vehicles.length >= limit ? (
        <div className="panel mt-8 p-6">
          <p className="font-display text-xl uppercase">Vehicle limit reached</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The {plan} plan includes {limit} vehicle{limit === 1 ? "" : "s"}. Pro unlocks up to {PLAN_LIMITS.pro.vehicles}.
          </p>
        </div>
      ) : (
        <div className="panel mt-8 p-5 sm:p-6">
          <NewVehicleForm />
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireBusiness } from "@/lib/db/business";
import { NewBuildForm } from "@/components/business/new-build-form";

export const metadata: Metadata = { title: "Create customer build", robots: { index: false } };

export default async function NewBusinessBuildPage() {
  const { client, org, canWork } = await requireBusiness();
  if (!canWork) redirect("/dashboard/business");
  const { data: crew } = await client.from("crews").select("id, name").eq("organization_id", org.id).maybeSingle();

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/business/builds" className="label-tech hover:text-foreground">
        ← Builds
      </Link>
      <h2 className="mt-3 text-3xl">Create a customer build</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The build gets its permanent QR right away. You manage it until the customer claims it. After that they own it and {org.name} keeps
        credit for the parts you record.
      </p>
      <div className="panel mt-6 p-5">
        <NewBuildForm orgId={org.id} hasCrew={Boolean(crew)} crewName={crew?.name ?? null} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";

import { requireAdmin } from "@/lib/supabase/server";
import type { AdminOrganizationRow } from "@/lib/types";
import { CreateOrganizationForm } from "@/components/admin/create-organization-form";
import { OrganizationRow } from "@/components/admin/organization-row";

export const metadata: Metadata = { title: "Businesses", robots: { index: false } };

export default async function AdminOrganizationsPage({ searchParams }: PageProps<"/admin/organizations">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const { client } = await requireAdmin();
  const { data, error } = await client.rpc("admin_list_organizations", { p_query: q });
  if (error) throw new Error(error.message);
  const orgs = (data as unknown as AdminOrganizationRow[]) ?? [];

  return (
    <div>
      <p className="eyebrow">BuildTags Business</p>
      <h1 className="mt-2 text-4xl">Businesses</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        New registrations start pending: profile only. Set Active once the Business plan is agreed to switch on customer builds, claims and
        crews. Verified adds the check mark and only means we confirmed the business is who it says. Open a business to manage its members, add
        yourself for testing, or see its analytics.
      </p>
      <CreateOrganizationForm />
      <form className="mt-6 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or slug" className="field" />
        <button type="submit" className="btn-ghost">
          Search
        </button>
      </form>
      {orgs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No businesses.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
          {orgs.map((o) => (
            <OrganizationRow key={o.id} org={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

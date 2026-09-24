import type { Metadata } from "next";
import Link from "next/link";

import { listMyOrganizations } from "@/lib/db/business";
import { requireProfile } from "@/lib/supabase/server";
import { RegisterBusinessForm } from "@/components/business/register-form";

export const metadata: Metadata = { title: "Register your business", robots: { index: false } };

export default async function RegisterBusinessPage() {
  const { client } = await requireProfile("/dashboard/business/register");
  const orgs = await listMyOrganizations(client);

  return (
    <div className="max-w-2xl">
      {orgs.length > 0 && (
        <Link href="/dashboard/business" className="label-tech hover:text-foreground">
          ← Back to business
        </Link>
      )}
      <p className="eyebrow mt-3">BuildTags Business</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Register your business</h1>
      <p className="mt-3 text-foreground/80">
        Shops, dealers, tuners and installers create build pages for customer vehicles, hand them off with a private claim link, and keep
        credit for their work. Registering sets up your business profile. We turn on the build tools once we&apos;ve talked about your
        setup.
      </p>
      <div className="panel mt-6 p-5">
        <RegisterBusinessForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Want to talk first?{" "}
        <Link href="/business/contact" className="text-foreground underline">
          Contact BuildTags Business
        </Link>
      </p>
    </div>
  );
}

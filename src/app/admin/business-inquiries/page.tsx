import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/server";
import type { BusinessInquiryRow } from "@/lib/types";
import { InquiryRow } from "@/components/admin/inquiry-row";

export const metadata: Metadata = { title: "Business inquiries", robots: { index: false } };

const FILTERS = ["open", "new", "contacted", "qualified", "pilot", "customer", "closed", "spam", "all"] as const;

export default async function BusinessInquiriesPage({ searchParams }: PageProps<"/admin/business-inquiries">) {
  const sp = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(String(sp.status)) ? String(sp.status) : "open";
  const { client } = await requireAdmin();
  let query = client.from("business_inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter === "open") query = query.in("status", ["new", "contacted", "qualified", "pilot"]);
  else if (filter !== "all") query = query.eq("status", filter as BusinessInquiryRow["status"]);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as BusinessInquiryRow[];

  return (
    <div>
      <p className="eyebrow">BuildTags Business</p>
      <h1 className="mt-2 text-4xl">Inquiries</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <Link key={s} href={`/admin/business-inquiries?status=${s}`} className={`btn-ghost btn-small ${s === filter ? "border-signal text-foreground" : ""}`}>
            {s}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
          {rows.map((q) => (
            <InquiryRow key={q.id} inquiry={q} />
          ))}
        </ul>
      )}
    </div>
  );
}

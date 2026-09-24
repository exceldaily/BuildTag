import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL, LEGAL_ADDRESS_LINES, LEGAL_DOCS, LEGAL_HAS_PLACEHOLDERS } from "@/lib/legal/config";
import { requireAdmin } from "@/lib/supabase/server";
import type { LegalAcceptanceRow } from "@/lib/types";

export const metadata: Metadata = { title: "Legal", robots: { index: false } };

/**
 * Read-only view of the legal configuration and recent acceptance records.
 * The legal identity and versions are edited only in src/lib/legal/config.ts
 * (commit + deploy), so no staff member can change them from here.
 */
export default async function AdminLegalPage() {
  const { client } = await requireAdmin();
  const { data } = await client.from("legal_acceptances").select("*").order("accepted_at", { ascending: false }).limit(50);
  const rows = (data ?? []) as LegalAcceptanceRow[];

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Legal</p>
        <h1 className="mt-2 text-4xl">Legal settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Read only. To change the operator, address, email or document versions, edit src/lib/legal/config.ts and deploy. Accepted records are never
          rewritten.
        </p>
      </div>

      {LEGAL_HAS_PLACEHOLDERS && (
        <p className="max-w-2xl rounded-sm border border-destructive/60 bg-destructive/10 p-4 text-sm">
          <strong>Placeholder in the legal operator.</strong> The public Terms and Privacy Policy currently show &quot;{LEGAL.operator.description}&quot;. Fill
          in the owner&apos;s legal name, or switch to the LLC, before relying on these documents.
        </p>
      )}

      <section>
        <h2 className="text-2xl">Operator</h2>
        <dl className="mt-3 grid max-w-3xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="text-muted-foreground">Legal operator</dt>
          <dd>{LEGAL.operator.description}</dd>
          <dt className="text-muted-foreground">Structure</dt>
          <dd>{LEGAL.operator.kind === "llc" ? "Limited liability company" : "Sole proprietorship"}</dd>
          <dt className="text-muted-foreground">Mailing address</dt>
          <dd>{LEGAL_ADDRESS_LINES.join(", ")}</dd>
          <dt className="text-muted-foreground">Support and legal email</dt>
          <dd>{LEGAL.email}</dd>
          <dt className="text-muted-foreground">Governing law and venue</dt>
          <dd>
            {LEGAL.governingState}, {LEGAL.venueCounty}
          </dd>
        </dl>
      </section>

      <section>
        <h2 className="text-2xl">Documents</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Document</th>
                <th className="py-2 pr-4 font-medium">Version</th>
                <th className="py-2 pr-4 font-medium">Re-acceptance required from</th>
                <th className="py-2 font-medium">Effective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.values(LEGAL_DOCS).map((d) => (
                <tr key={d.path}>
                  <td className="py-2 pr-4">
                    <Link href={d.path} className="underline underline-offset-2">
                      {d.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{d.version}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{"requiredVersion" in d ? d.requiredVersion : "n/a"}</td>
                  <td className="py-2">{d.effective}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl">Recent acceptances</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No acceptance records yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Version</th>
                  <th className="py-2 pr-4 font-medium">Context</th>
                  <th className="py-2 font-medium">Subject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.accepted_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.user_id.slice(0, 8)}</td>
                    <td className="py-2 pr-4">{r.document_type.replaceAll("_", " ")}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.document_version}</td>
                    <td className="py-2 pr-4">{r.acceptance_context.replaceAll("_", " ")}</td>
                    <td className="py-2 font-mono text-xs">{r.subject_type ? `${r.subject_type} ${r.subject_id?.slice(0, 8) ?? ""}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

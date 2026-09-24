"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateInquiryAction } from "@/lib/actions/admin-business";
import type { BusinessInquiryRow, BusinessInquiryStatus } from "@/lib/types";
import { BUSINESS_INTEREST_LABEL } from "@/lib/validation/business";

const STATUSES: BusinessInquiryStatus[] = ["new", "contacted", "qualified", "pilot", "customer", "closed", "spam"];

export function InquiryRow({ inquiry: q }: { inquiry: BusinessInquiryRow }) {
  const [notes, setNotes] = useState(q.admin_notes);
  const [pending, start] = useTransition();
  const save = (input: { status?: BusinessInquiryStatus; notes?: string }, msg: string) =>
    start(async () => {
      const res = await updateInquiryAction(q.id, input);
      if (!res.ok) toast.error(res.error);
      else toast.success(msg);
    });

  return (
    <li className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-display text-lg font-bold uppercase">
          {q.business_name} <span className="text-sm font-normal normal-case text-muted-foreground">· {q.business_type.replaceAll("_", " ")}</span>
        </p>
        <p>
          {q.name} ·{" "}
          <a href={`mailto:${q.email}`} className="underline">
            {q.email}
          </a>
          {q.phone ? ` · ${q.phone}` : ""}
          {q.website ? (
            <>
              {" · "}
              <a href={q.website} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                {q.website.replace(/^https?:\/\//, "")}
              </a>
            </>
          ) : null}
        </p>
        <p className="text-muted-foreground">
          {[q.industry, q.location_count ? `${q.location_count} locations` : null, q.builds_per_month ? `${q.builds_per_month} builds/mo` : null].filter(Boolean).join(" · ") || "No size info"}
        </p>
        {q.interests.length > 0 && (
          <p className="text-muted-foreground">Interested in: {q.interests.map((i) => BUSINESS_INTEREST_LABEL[i as keyof typeof BUSINESS_INTEREST_LABEL] ?? i).join(", ")}</p>
        )}
        {q.message && <p className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3 text-foreground/85">{q.message}</p>}
        <p className="label-tech pt-1">
          {new Date(q.created_at).toLocaleString()} · {q.source}
        </p>
      </div>
      <div className="space-y-2">
        <select
          aria-label="Status"
          defaultValue={q.status}
          disabled={pending}
          onChange={(e) => save({ status: e.target.value as BusinessInquiryStatus }, "Status updated")}
          className="field"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={8000} placeholder="Notes" aria-label="Admin notes" className="field-textarea min-h-20" />
        <button type="button" className="btn-ghost btn-small" disabled={pending || notes === q.admin_notes} onClick={() => save({ notes }, "Notes saved")}>
          Save notes
        </button>
      </div>
    </li>
  );
}

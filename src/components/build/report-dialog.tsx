"use client";

import { Flag } from "lucide-react";
import { useActionState, useState } from "react";

import { submitReportAction } from "@/lib/actions/public";
import { REPORT_REASONS } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ReportDialog({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitReportAction, null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-small text-muted-foreground">
        <Flag className="size-3.5" aria-hidden="true" />
        Report build
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-popover">
          <DialogHeader>
            <DialogTitle className="text-2xl">Report this build</DialogTitle>
            <DialogDescription>Tell us what is wrong. Reports are reviewed by moderators.</DialogDescription>
          </DialogHeader>
          {state?.ok ? (
            <p className="text-sm">Thanks. The report has been filed.</p>
          ) : (
            <form action={action} className="space-y-4">
              <input type="hidden" name="slug" value={slug} />
              <fieldset>
                <legend className="field-label">Reason</legend>
                <div className="space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="reason" value={r.value} required className="accent-[#ff2d7a]" />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="report-description" className="field-label">
                  Details (optional)
                </label>
                <textarea id="report-description" name="description" maxLength={1000} className="field-textarea min-h-20" />
              </div>
              {state && !state.ok && (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              )}
              <button type="submit" className="btn-signal w-full" disabled={pending}>
                {pending ? "Sending…" : "Submit report"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

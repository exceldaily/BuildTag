"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveCustomerRecordAction } from "@/lib/actions/business";

import { Field } from "./field";

export interface CustomerRecord {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string;
}

/** Private customer details. Only this business's team can read them. */
export function CustomerRecordForm({ orgId, vehicleId, record }: { orgId: string; vehicleId: string; record: CustomerRecord | null }) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      className="panel space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const res = await saveCustomerRecordAction(orgId, vehicleId, form);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          setErrors({});
          toast.success("Customer details saved");
        });
      }}
      noValidate
    >
      <div>
        <h3 className="text-xl">Customer (private)</h3>
        <p className="mt-1 text-sm text-muted-foreground">Only your team sees this. Never public, never shared with the customer&apos;s account.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" htmlFor="cr-name">
          <input id="cr-name" name="customer_name" defaultValue={record?.customer_name ?? ""} maxLength={120} className="field" autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="cr-email" error={errors.customer_email}>
          <input id="cr-email" name="customer_email" type="email" defaultValue={record?.customer_email ?? ""} className="field" autoComplete="off" />
        </Field>
        <Field label="Phone" htmlFor="cr-phone">
          <input id="cr-phone" name="customer_phone" type="tel" defaultValue={record?.customer_phone ?? ""} maxLength={40} className="field" autoComplete="off" />
        </Field>
      </div>
      <Field label="Notes" htmlFor="cr-notes">
        <textarea id="cr-notes" name="notes" defaultValue={record?.notes ?? ""} maxLength={2000} rows={2} className="field-textarea min-h-16" />
      </Field>
      <button type="submit" className="btn-ghost btn-small" disabled={pending}>
        {pending ? "Saving…" : "Save customer details"}
      </button>
    </form>
  );
}

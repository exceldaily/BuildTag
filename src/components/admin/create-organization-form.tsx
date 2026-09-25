"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { adminCreateOrganizationAction, type AdminCreateOrganizationInput } from "@/lib/actions/admin-business";
import { ORGANIZATION_TYPES } from "@/lib/types";

/**
 * Admin-only: set up a business account directly (for a customer, or a
 * sandbox to test the business dashboard). The owner can be a username, the
 * email of an existing account, or a new email, which becomes an invite that
 * turns into a membership when that person signs up and confirms the email.
 */
export function CreateOrganizationForm() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const submit = (form: FormData) =>
    start(async () => {
      const input = Object.fromEntries(form.entries()) as unknown as AdminCreateOrganizationInput;
      const res = await adminCreateOrganizationAction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.data.owner === "invited" ? "Business created. Owner invited by email." : "Business created");
      router.push(`/admin/organizations/${res.data.id}`);
    });

  return (
    <details className="mt-6 rounded-lg border border-line">
      <summary className="cursor-pointer px-4 py-3 font-display text-sm font-semibold tracking-[0.14em] uppercase">Create business account</summary>
      <form action={submit} className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="label-tech">Business name</span>
          <input name="name" required minLength={2} maxLength={80} className="field" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="label-tech">Type</span>
          <select name="organization_type" defaultValue="custom_shop" className="field">
            {ORGANIZATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="label-tech">Owner: username or email</span>
          <input name="owner" maxLength={200} placeholder="@username or owner@shop.com" className="field" autoComplete="off" />
          <span className="text-xs text-muted-foreground">
            An email without a BuildTags account becomes an invite. They join automatically after they sign up and confirm that email.
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="label-tech">Status</span>
          <select name="status" defaultValue="active" className="field">
            <option value="active">Active (Business on)</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="label-tech">Verification</span>
          <select name="verified" defaultValue="unverified" className="field">
            <option value="unverified">Unverified</option>
            <option value="verified">Verified</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="label-tech">Add me to it (for testing)</span>
          <select name="add_self" defaultValue="" className="field">
            <option value="">No</option>
            <option value="owner">Yes, as owner</option>
            <option value="staff">Yes, as staff</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="label-tech">Business email</span>
          <input name="email" type="email" maxLength={200} className="field" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="label-tech">Phone</span>
          <input name="phone" maxLength={40} className="field" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-sm">
            <span className="label-tech">City</span>
            <input name="city" maxLength={80} className="field" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="label-tech">State / region</span>
            <input name="region" maxLength={80} className="field" />
          </label>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="btn-signal btn-small">
            {pending ? "Creating…" : "Create business"}
          </button>
        </div>
      </form>
    </details>
  );
}

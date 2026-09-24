"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveOrgCrewAction } from "@/lib/actions/business";
import { CREW_KIND_LABEL, type CrewKind } from "@/lib/types";

import { Field } from "./field";

const KINDS: CrewKind[] = ["shop", "dealership", "brand", "customer", "riding"];

export function OrgCrewForm({ orgId, crew, defaultName }: { orgId: string; crew: { name: string; tagline: string; kind: CrewKind } | null; defaultName: string }) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const res = await saveOrgCrewAction(orgId, Boolean(crew), form);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          setErrors({});
          toast.success(crew ? "Crew updated" : "Crew created");
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Field label="Crew name" htmlFor="crew-name" error={errors.name}>
          <input id="crew-name" name="name" defaultValue={crew?.name ?? `${defaultName} Riders`.slice(0, 40)} maxLength={40} className="field" />
        </Field>
        <Field label="Kind" htmlFor="crew-kind">
          <select id="crew-kind" name="kind" defaultValue={crew?.kind ?? "shop"} className="field">
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {CREW_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Tagline" htmlFor="crew-tagline" optional>
        <input id="crew-tagline" name="tagline" defaultValue={crew?.tagline ?? ""} maxLength={140} className="field" />
      </Field>
      <button type="submit" className="btn-signal btn-small" disabled={pending}>
        {pending ? "Saving…" : crew ? "Save crew" : "Start the crew"}
      </button>
    </form>
  );
}

import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  { id: "vehicle", label: "Vehicle" },
  { id: "photos", label: "Photos" },
  { id: "performance", label: "Performance" },
  { id: "socials", label: "Socials" },
  { id: "modifications", label: "Mods" },
  { id: "buildtag", label: "BuildTag" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export function WizardSteps({ current }: { current: WizardStepId }) {
  const idx = WIZARD_STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto" aria-label="Setup progress">
      {WIZARD_STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center gap-1">
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-display text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap",
              i < idx && "border-emerald-500/40 text-emerald-400",
              i === idx && "border-signal bg-signal/10 text-foreground",
              i > idx && "border-line text-muted-foreground",
            )}
            aria-current={i === idx ? "step" : undefined}
          >
            <span className="tabular-nums">{i + 1}</span>
            {s.label}
          </span>
          {i < WIZARD_STEPS.length - 1 && <span className="h-px w-3 bg-line" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

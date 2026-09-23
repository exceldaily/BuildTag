"use client";

import { FRAME_LIST, SAFE_QR_PAIRS, SHAPE_LIST, SIZE_PRESETS, STYLE_LIST, TEMPLATE_LIST, renderTagSvg } from "@/lib/tag";
import { qrContrastVerdict } from "@/lib/qr/contrast";
import type { FrameId, ShapeId, StyleId, TagConfig, TagData, TemplateId } from "@/lib/tag/types";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PanelId = "template" | "style" | "shape" | "frame" | "content" | "colors" | "size" | "export";

interface Props {
  panel: PanelId;
  config: TagConfig;
  data: TagData;
  plan: Plan;
  onChange: (patch: Partial<TagConfig> | ((c: TagConfig) => TagConfig)) => void;
}

/** Billing is not live yet, so Pro items are labelled but not locked. */
const PRO_LOCKED = false;

export function DesignerControls({ panel, config, data, plan, onChange }: Props) {
  const locked = (pro: boolean) => PRO_LOCKED && pro && plan !== "pro";

  switch (panel) {
    case "template":
      return (
        <Section title="Templates" hint="A starting point. Everything stays editable.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TEMPLATE_LIST.map((t) => {
              const cfg = { ...t.build(), size: config.size };
              const thumb = renderTagSvg(cfg, data, { idPrefix: `tpl-${t.id}` });
              return (
                <ChoiceCard
                  key={t.id}
                  active={config.template === t.id}
                  onClick={() => onChange({ ...cfg, template: t.id as TemplateId })}
                  title={t.name}
                  subtitle={t.description}
                  preview={thumb.svg}
                  ratio={thumb.layout.height / thumb.layout.width}
                />
              );
            })}
          </div>
        </Section>
      );

    case "style":
      return (
        <Section title="Automotive styles" hint="Sets fonts, palette and decoration. QR colors stay safe by default.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STYLE_LIST.map((s) => {
              const cfg: TagConfig = { ...config, style: s.id as StyleId, colors: { ...s.colors } };
              const thumb = renderTagSvg(cfg, data, { idPrefix: `sty-${s.id}` });
              return (
                <ChoiceCard
                  key={s.id}
                  active={config.style === s.id}
                  disabled={locked(s.pro)}
                  pro={s.pro}
                  onClick={() => onChange({ style: s.id as StyleId, colors: { ...s.colors } })}
                  title={s.name}
                  subtitle={s.description}
                  preview={thumb.svg}
                  ratio={thumb.layout.height / thumb.layout.width}
                />
              );
            })}
          </div>
        </Section>
      );

    case "shape":
      return (
        <Section title="Decal shape" hint="The outer cut line. The QR itself is never distorted.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SHAPE_LIST.map((s) => {
              const cfg: TagConfig = { ...config, shape: s.id as ShapeId };
              const thumb = renderTagSvg(cfg, data, { idPrefix: `shp-${s.id}` });
              return (
                <ChoiceCard
                  key={s.id}
                  active={config.shape === s.id}
                  disabled={locked(s.pro)}
                  pro={s.pro}
                  onClick={() => onChange({ shape: s.id as ShapeId })}
                  title={s.name}
                  preview={thumb.svg}
                  ratio={thumb.layout.height / thumb.layout.width}
                />
              );
            })}
          </div>
        </Section>
      );

    case "frame":
      return (
        <Section title="QR frame" hint="Decoration drawn around the protected QR area, never through it. Frames shrink the code, so check the module size before printing.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FRAME_LIST.map((f) => {
              const cfg: TagConfig = { ...config, frame: f.id as FrameId };
              const thumb = renderTagSvg(cfg, data, { idPrefix: `frm-${f.id}` });
              return (
                <ChoiceCard
                  key={f.id}
                  active={config.frame === f.id}
                  disabled={locked(f.pro)}
                  pro={f.pro}
                  onClick={() => onChange({ frame: f.id as FrameId })}
                  title={f.name}
                  preview={thumb.svg}
                  ratio={thumb.layout.height / thumb.layout.width}
                />
              );
            })}
          </div>
        </Section>
      );

    case "content": {
      const c = config.content;
      const toggle = (key: keyof typeof c) => onChange((cfg) => ({ ...cfg, content: { ...cfg.content, [key]: !cfg.content[key] } }));
      const rows: { key: keyof typeof c; label: string; value?: string; disabled?: boolean }[] = [
        { key: "logo", label: "BuildTag logo" },
        { key: "qr", label: "QR code" },
        { key: "scanText", label: "SCAN THE BUILD" },
        { key: "whatsDoneText", label: "WHAT'S DONE TO IT?" },
        { key: "buildSheetText", label: "BUILD SHEET" },
        { key: "year", label: "Vehicle year", value: data.year ? String(data.year) : "", disabled: !data.year },
        { key: "make", label: "Vehicle make", value: data.make },
        { key: "model", label: "Vehicle model", value: data.model },
        { key: "nickname", label: "Nickname", value: data.nickname, disabled: !data.nickname },
        { key: "horsepower", label: "Horsepower", value: data.powerLabel, disabled: !data.powerLabel },
        { key: "social", label: "Social handle", value: data.socialHandle, disabled: !data.socialHandle },
      ];
      return (
        <Section title="Content" hint="Toggle what appears on the decal. Values come from your build.">
          <ul className="divide-y divide-line rounded-lg border border-line">
            {rows.map((r) => (
              <li key={r.key}>
                <label className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", r.disabled && "opacity-50")}>
                  <input type="checkbox" checked={Boolean(c[r.key])} disabled={r.disabled} onChange={() => toggle(r.key)} className="size-4 accent-[#ff2d7a]" />
                  <span className="flex-1">{r.label}</span>
                  {r.value !== undefined && <span className="truncate text-xs text-muted-foreground">{r.value || "not set"}</span>}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="custom-text" className="field-label">
                Custom short text
              </label>
              <input id="custom-text" value={c.customText} maxLength={40} placeholder="STAGE 2 · E85" onChange={(e) => onChange((cfg) => ({ ...cfg, content: { ...cfg.content, customText: e.target.value } }))} className="field" />
            </div>
            <div>
              <label htmlFor="cta-text" className="field-label">
                Call to action
              </label>
              <input id="cta-text" value={config.ctaText} maxLength={40} placeholder="SCAN THE BUILD" onChange={(e) => onChange({ ctaText: e.target.value })} className="field" />
              <p className="mt-1 text-xs text-muted-foreground">Leave empty to use the default when SCAN THE BUILD is on.</p>
            </div>
          </div>
        </Section>
      );
    }

    case "colors": {
      const contrast = qrContrastVerdict(config.colors.qrDark, config.colors.qrLight);
      const set = (key: keyof TagConfig["colors"], value: string) => onChange((cfg) => ({ ...cfg, colors: { ...cfg.colors, [key]: value } }));
      return (
        <Section title="Colors" hint="Decorative areas are free. QR colors are checked for contrast and blocked when unsafe.">
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField label="Background" value={config.colors.background} onChange={(v) => set("background", v)} />
            <ColorField label="Text" value={config.colors.foreground} onChange={(v) => set("foreground", v)} />
            <ColorField label="Accent" value={config.colors.accent} onChange={(v) => set("accent", v)} />
          </div>
          <div className="mt-5 rounded-lg border border-line p-3">
            <p className="label-tech">QR colors</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <ColorField label="Modules (dark)" value={config.colors.qrDark} onChange={(v) => set("qrDark", v)} />
              <ColorField label="Plate (light)" value={config.colors.qrLight} onChange={(v) => set("qrLight", v)} />
            </div>
            <p
              className={cn(
                "mt-3 text-xs",
                contrast.verdict === "blocked" ? "text-destructive" : contrast.verdict === "warning" ? "text-amber-300" : "text-emerald-400",
              )}
            >
              Contrast {contrast.ratio.toFixed(1)}:1 ·{" "}
              {contrast.verdict === "blocked"
                ? "too low to print"
                : contrast.verdict === "warning"
                  ? "marginal, test before printing"
                  : contrast.verdict === "acceptable"
                    ? "acceptable"
                    : "ideal"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SAFE_QR_PAIRS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange((cfg) => ({ ...cfg, colors: { ...cfg.colors, qrDark: p.qrDark, qrLight: p.qrLight } }))}
                  className="btn-ghost btn-small"
                >
                  <span className="inline-block size-3 rounded-sm border border-line" style={{ background: p.qrDark }} />
                  <span className="inline-block size-3 rounded-sm border border-line" style={{ background: p.qrLight }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Section>
      );
    }

    case "size": {
      const s = config.size;
      const setSize = (patch: Partial<TagConfig["size"]>) => onChange((cfg) => ({ ...cfg, size: { ...cfg.size, ...patch } }));
      const toUnit = (inches: number) => (s.unit === "mm" ? Math.round(inches * 25.4) : inches);
      return (
        <Section title="Decal size" hint="Width of the decal; height follows the shape. Bigger scans from further away.">
          <div className="grid grid-cols-3 gap-2">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSize({ preset: p.id, width: toUnit(p.inches) })}
                className={cn("btn-ghost flex-col gap-0 py-6", s.preset === p.id && "border-signal text-foreground")}
              >
                <span>{p.label}</span>
                <span className="text-[11px] normal-case tracking-normal text-muted-foreground">
                  {s.unit === "mm" ? `${Math.round(p.inches * 25.4)} mm` : `${p.inches} in`} wide
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
            <div>
              <label htmlFor="custom-width" className="field-label">
                Custom width
              </label>
              <input
                id="custom-width"
                type="number"
                inputMode="decimal"
                min={s.unit === "mm" ? 30 : 1.2}
                max={s.unit === "mm" ? 400 : 16}
                step={s.unit === "mm" ? 1 : 0.25}
                value={s.width}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) setSize({ preset: "custom", width: n });
                }}
                className="field"
              />
            </div>
            <div>
              <span className="field-label">Units</span>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-1">
                {(["in", "mm"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      if (u === s.unit) return;
                      const width = u === "mm" ? Math.round(s.width * 25.4) : Math.round((s.width / 25.4) * 100) / 100;
                      setSize({ unit: u, width, preset: "custom" });
                    }}
                    className={cn("h-9 rounded font-display text-sm font-bold tracking-wider uppercase", s.unit === u ? "bg-foreground text-background" : "text-muted-foreground")}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      );
    }

    default:
      return null;
  }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl">{title}</h2>
      {hint && <p className="mt-1 mb-4 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

function ChoiceCard({
  active,
  disabled,
  pro,
  onClick,
  title,
  subtitle,
  preview,
  ratio,
}: {
  active: boolean;
  disabled?: boolean;
  pro?: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  preview: string;
  ratio: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border bg-surface text-left transition-colors focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:outline-none",
        active ? "border-signal" : "border-line hover:border-foreground/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="relative flex aspect-square items-center justify-center bg-[#141416] p-3">
        <div style={{ width: ratio > 1 ? `${100 / ratio}%` : "100%", aspectRatio: `1 / ${ratio}` }} dangerouslySetInnerHTML={{ __html: preview }} />
        {pro && <span className="absolute top-1.5 right-1.5 rounded bg-background/90 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-[0.16em] text-signal uppercase">Pro</span>}
      </div>
      <div className="px-3 py-2">
        <p className="font-display text-sm font-bold tracking-wider uppercase">{title}</p>
        {subtitle && <p className="text-[11px] leading-snug text-muted-foreground">{subtitle}</p>}
      </div>
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="flex items-center gap-2 rounded-md border border-input bg-background px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={`${label} color`} />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) onChange(v);
          }}
          className="h-10 flex-1 bg-transparent font-mono text-sm uppercase outline-none"
          aria-label={`${label} hex`}
        />
      </span>
    </label>
  );
}

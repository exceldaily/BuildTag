"use client";

import { Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { qrContrastVerdict } from "@/lib/qr/contrast";
import { QR_FINDER_STYLES, QR_MODULE_STYLES, LOGO_MAX_SCALE, LOGO_MIN_SCALE } from "@/lib/qr/render";
import { BACKGROUND_OPTIONS, CTA_PRESETS, FONT_LIST, FRAME_LIST, LAYOUT_LIST, MATERIALS, PALETTES, SAFE_QR_PAIRS, SHAPE_LIST, SIZE_PRESETS, TEMPLATE_LIST, renderTagSvg, sizeFromPreset } from "@/lib/tag";
import { SOCIAL_GLYPHS } from "@/lib/tag/icons";
import type { BackgroundKind, FrameId, LayoutId, MaterialId, ShapeId, TagConfig, TagData, TemplateId, TextFields } from "@/lib/tag/types";
import type { Plan, PrintSpecificationRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type SectionId = "template" | "shape" | "layout" | "qr" | "frame" | "colors" | "text" | "vehicle" | "social" | "background" | "size" | "material" | "advanced";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "template", label: "Template" },
  { id: "shape", label: "Shape" },
  { id: "layout", label: "Layout" },
  { id: "qr", label: "QR Style" },
  { id: "frame", label: "Frame" },
  { id: "colors", label: "Colors" },
  { id: "text", label: "Text" },
  { id: "vehicle", label: "Vehicle Data" },
  { id: "social", label: "Social" },
  { id: "background", label: "Background" },
  { id: "size", label: "Size" },
  { id: "material", label: "Material Preview" },
  { id: "advanced", label: "Advanced" },
];

interface Props {
  config: TagConfig;
  data: TagData;
  plan: Plan;
  printSpecs: PrintSpecificationRow[];
  shopLogos: { id: string; name: string }[];
  autosave: boolean;
  onAutosave: (v: boolean) => void;
  onChange: (patch: Partial<TagConfig> | ((c: TagConfig) => TagConfig)) => void;
}

export function DesignerControls({ config, data, printSpecs, shopLogos, autosave, onAutosave, onChange }: Props) {
  const [open, setOpen] = useState<SectionId>("template");
  const set = <K extends keyof TagConfig>(key: K, value: TagConfig[K]) => onChange({ [key]: value } as Partial<TagConfig>);

  return (
    <div className="divide-y divide-line rounded-lg border border-line bg-surface">
      {SECTIONS.map((s) => (
        <details key={s.id} open={open === s.id} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && setOpen(s.id)} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
            <span className="font-display text-sm font-bold tracking-[0.16em] uppercase">{s.label}</span>
            <span className="text-signal transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="px-4 pb-5">
            {open === s.id && (
              <>
                {s.id === "template" && <TemplateSection config={config} data={data} onChange={onChange} />}
                {s.id === "shape" && <ShapeSection config={config} data={data} set={set} />}
                {s.id === "layout" && <LayoutSection config={config} set={set} />}
                {s.id === "qr" && <QrSection config={config} shopLogos={shopLogos} onChange={onChange} />}
                {s.id === "frame" && <FrameSection config={config} data={data} set={set} />}
                {s.id === "colors" && <ColorsSection config={config} onChange={onChange} />}
                {s.id === "text" && <TextSection config={config} onChange={onChange} />}
                {s.id === "vehicle" && <VehicleSection config={config} data={data} onChange={onChange} />}
                {s.id === "social" && <SocialSection config={config} data={data} onChange={onChange} />}
                {s.id === "background" && <BackgroundSection config={config} onChange={onChange} />}
                {s.id === "size" && <SizeSection config={config} onChange={onChange} />}
                {s.id === "material" && <MaterialSection config={config} printSpecs={printSpecs} set={set} />}
                {s.id === "advanced" && <AdvancedSection config={config} onChange={onChange} autosave={autosave} onAutosave={onAutosave} />}
              </>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Shared bits
 * ------------------------------------------------------------------------- */

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs text-muted-foreground">{children}</p>;
}

function Thumb({ svg, ratio, active, title, subtitle, onClick, badge }: { svg: string; ratio: number; active: boolean; title: string; subtitle?: string; onClick: () => void; badge?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex flex-col overflow-hidden rounded-md border bg-[#100d1f] text-left transition-colors focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:outline-none", active ? "border-signal" : "border-line hover:border-foreground/40")}>
      <div className="relative flex aspect-square items-center justify-center p-2">
        <div style={{ width: ratio > 1 ? `${100 / ratio}%` : "100%", aspectRatio: `1 / ${ratio}` }} dangerouslySetInnerHTML={{ __html: svg }} />
        {badge && <span className="absolute top-1 right-1 rounded bg-background/90 px-1 py-0.5 font-display text-[9px] font-bold tracking-[0.16em] text-neon-amber uppercase">{badge}</span>}
      </div>
      <div className="px-2 py-1.5">
        <p className="font-display text-xs font-bold tracking-wider uppercase">{title}</p>
        {subtitle && <p className="text-[10px] leading-snug text-muted-foreground">{subtitle}</p>}
      </div>
    </button>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: { id: T; name: string; description?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id} title={o.description} className={cn("h-8 rounded-md border px-2.5 font-display text-[11px] font-bold tracking-[0.12em] uppercase", value === o.id ? "border-signal bg-signal/10 text-foreground" : "border-line text-muted-foreground hover:text-foreground")}>
          {o.name}
        </button>
      ))}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="flex items-center gap-2 rounded-md border border-input bg-background px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={`${label} color`} />
        <input type="text" value={value} onChange={(e) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.target.value.trim()) && onChange(e.target.value.trim())} className="h-9 flex-1 bg-transparent font-mono text-xs uppercase outline-none" aria-label={`${label} hex`} />
      </span>
    </label>
  );
}

async function uploadAsset(file: File, kind: "logo" | "background"): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  const res = await fetch("/api/tag-assets", { method: "POST", body });
  const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
  if (!res.ok || !json.ok || !json.url) throw new Error(json.error ?? "Upload failed");
  return json.url;
}

/* ---------------------------------------------------------------------------
 * Sections
 * ------------------------------------------------------------------------- */

function TemplateSection({ config, data, onChange }: { config: TagConfig; data: TagData; onChange: Props["onChange"] }) {
  const thumbs = useMemo(() => TEMPLATE_LIST.map((t) => ({ t, r: renderTagSvg(t.build(), data, { material: false, idPrefix: `tpl-${t.id}` }) })), [data]);
  return (
    <>
      <Hint>Starting points. Each one sets shape, layout, type, QR style, frame and colors; everything stays editable.</Hint>
      <div className="grid grid-cols-2 gap-2">
        {thumbs.map(({ t, r }) => (
          <Thumb key={t.id} svg={r.svg} ratio={r.layout.height / r.layout.width} active={config.template === t.id} title={t.name} subtitle={t.tagline} onClick={() => onChange({ ...t.build(), template: t.id as TemplateId })} />
        ))}
      </div>
    </>
  );
}

function ShapeSection({ config, data, set }: { config: TagConfig; data: TagData; set: <K extends keyof TagConfig>(k: K, v: TagConfig[K]) => void }) {
  const thumbs = useMemo(() => SHAPE_LIST.map((s) => ({ s, r: renderTagSvg({ ...config, shape: s.id }, data, { material: false, idPrefix: `shp-${s.id}` }) })), [config, data]);
  return (
    <>
      <Hint>The cut line. Round shapes use the largest square inside the chosen size. The QR is never distorted.</Hint>
      <div className="grid grid-cols-2 gap-2">
        {thumbs.map(({ s, r }) => (
          <Thumb key={s.id} svg={r.svg} ratio={r.layout.height / r.layout.width} active={config.shape === s.id} title={s.name} subtitle={s.description} onClick={() => set("shape", s.id as ShapeId)} />
        ))}
      </div>
    </>
  );
}

function LayoutSection({ config, set }: { config: TagConfig; set: <K extends keyof TagConfig>(k: K, v: TagConfig[K]) => void }) {
  return (
    <>
      <Hint>Curated arrangements. Pick one; the engine fits your text and keeps the QR protected.</Hint>
      <div className="space-y-1.5">
        {LAYOUT_LIST.map((l) => (
          <button key={l.id} type="button" onClick={() => set("layout", l.id as LayoutId)} aria-pressed={config.layout === l.id} className={cn("flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left", config.layout === l.id ? "border-signal bg-signal/10" : "border-line hover:border-foreground/40")}>
            <LayoutGlyph id={l.id as LayoutId} />
            <span>
              <span className="block font-display text-xs font-bold tracking-wider uppercase">{l.name}</span>
              <span className="block text-[11px] text-muted-foreground">{l.description}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function LayoutGlyph({ id }: { id: LayoutId }) {
  const row = id === "qr-left" || id === "qr-right" || id === "wide";
  const qrLeft = id !== "qr-right";
  return (
    <svg viewBox="0 0 40 40" className="size-9 shrink-0 text-muted-foreground" aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="4" fill="none" stroke="currentColor" opacity="0.5" />
      {row ? (
        <>
          <rect x={qrLeft ? 5 : 21} y="10" width="14" height="20" fill="currentColor" opacity="0.9" />
          <rect x={qrLeft ? 23 : 5} y="12" width="12" height="3" fill="currentColor" opacity="0.5" />
          <rect x={qrLeft ? 23 : 5} y="18" width="12" height="3" fill="currentColor" opacity="0.5" />
          <rect x={qrLeft ? 23 : 5} y="24" width="8" height="3" fill="currentColor" opacity="0.5" />
        </>
      ) : (
        <>
          {(id === "text-above" || id === "power" || id === "badge") && <rect x="8" y="5" width="24" height="3" fill="currentColor" opacity="0.5" />}
          <rect x="12" y={id === "text-above" ? 11 : 9} width="16" height="16" fill="currentColor" opacity="0.9" />
          {id !== "text-above" && <rect x="8" y="29" width="24" height="3" fill="currentColor" opacity="0.5" />}
          {id === "text-above" && <rect x="10" y="31" width="20" height="3" fill="currentColor" opacity="0.5" />}
        </>
      )}
    </svg>
  );
}

function QrSection({ config, shopLogos, onChange }: { config: TagConfig; shopLogos: { id: string; name: string }[]; onChange: Props["onChange"] }) {
  const q = config.qr;
  const setQr = (patch: Partial<TagConfig["qr"]>) => onChange((c) => ({ ...c, qr: { ...c.qr, ...patch } }));
  const setLogo = (patch: Partial<TagConfig["qr"]["logo"]>) => onChange((c) => ({ ...c, qr: { ...c.qr, logo: { ...c.qr.logo, ...patch } } }));
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <Hint>Only styles that keep every module in place. The decoder test runs on every change.</Hint>
      <p className="field-label">Module style</p>
      <Chips options={QR_MODULE_STYLES} value={q.moduleStyle} onChange={(v) => setQr({ moduleStyle: v })} />
      <p className="field-label mt-4">Finder patterns</p>
      <Chips options={QR_FINDER_STYLES} value={q.finderStyle} onChange={(v) => setQr({ finderStyle: v })} />
      <p className="field-label mt-4">Center logo</p>
      <Chips
        options={[
          { id: "none", name: "None" },
          { id: "buildtag", name: "Btag" },
          { id: "upload", name: "Your logo" },
          ...(shopLogos.length ? [{ id: "shop", name: "Shop logo" }] : []),
        ]}
        value={q.logo.kind}
        onChange={(v) => setLogo({ kind: v as TagConfig["qr"]["logo"]["kind"] })}
      />
      {q.logo.kind === "upload" && (
        <label className="btn-ghost btn-small mt-2 cursor-pointer">
          <Upload className="size-3.5" aria-hidden="true" /> {uploading ? "Uploading…" : q.logo.url ? "Replace logo" : "Upload PNG or SVG"}
          <input
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setUploading(true);
              try {
                setLogo({ url: await uploadAsset(f, "logo") });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Upload failed");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
      )}
      {q.logo.kind === "shop" && <p className="mt-2 text-xs text-muted-foreground">Upload your shop logo under &ldquo;Your logo&rdquo; for now; shop profiles will carry their own artwork.</p>}
      {q.logo.kind !== "none" && (
        <label className="mt-3 block">
          <span className="field-label">Logo size (auto-limited to a safe range)</span>
          <input type="range" min={LOGO_MIN_SCALE} max={LOGO_MAX_SCALE} step={0.01} value={q.logo.scale} onChange={(e) => setLogo({ scale: Number(e.target.value) })} className="w-full accent-[#ff2d7a]" />
        </label>
      )}
      <label className="mt-4 block">
        <span className="field-label">QR block size ({Math.round(q.scale * 100)}%)</span>
        <input type="range" min={0.6} max={1} step={0.02} value={q.scale} onChange={(e) => setQr({ scale: Number(e.target.value) })} className="w-full accent-[#ff2d7a]" />
      </label>
    </>
  );
}

function FrameSection({ config, data, set }: { config: TagConfig; data: TagData; set: <K extends keyof TagConfig>(k: K, v: TagConfig[K]) => void }) {
  const thumbs = useMemo(() => FRAME_LIST.map((f) => ({ f, r: renderTagSvg({ ...config, frame: f.id }, data, { material: false, idPrefix: `frm-${f.id}` }) })), [config, data]);
  return (
    <>
      <Hint>Decoration around the protected block, never through it. Frames shrink the code, so watch the module size.</Hint>
      <div className="grid grid-cols-2 gap-2">
        {thumbs.map(({ f, r }) => (
          <Thumb key={f.id} svg={r.svg} ratio={r.layout.height / r.layout.width} active={config.frame === f.id} title={f.name} subtitle={f.description} onClick={() => set("frame", f.id as FrameId)} />
        ))}
      </div>
    </>
  );
}

function ColorsSection({ config, onChange }: { config: TagConfig; onChange: Props["onChange"] }) {
  const c = config.colors;
  const setColor = (key: keyof TagConfig["colors"], value: string) => onChange((cfg) => ({ ...cfg, colors: { ...cfg.colors, [key]: value } }));
  const contrast = qrContrastVerdict(c.qrDark, c.qrLight);
  return (
    <>
      <Hint>Automotive palettes to start; every field is editable. QR colors are contrast-checked.</Hint>
      <div className="grid grid-cols-3 gap-1.5">
        {PALETTES.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange((cfg) => ({ ...cfg, colors: { ...p.colors } }))} className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-left hover:border-foreground/40">
            <span className="flex overflow-hidden rounded">
              <span className="size-3" style={{ background: p.colors.background }} />
              <span className="size-3" style={{ background: p.colors.accent }} />
              <span className="size-3" style={{ background: p.colors.foreground }} />
            </span>
            <span className="truncate font-display text-[10px] font-bold tracking-wider uppercase">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        <ColorField label="Background" value={c.background} onChange={(v) => setColor("background", v)} />
        <ColorField label="Text" value={c.foreground} onChange={(v) => setColor("foreground", v)} />
        <ColorField label="Accent" value={c.accent} onChange={(v) => setColor("accent", v)} />
      </div>
      <div className="mt-4 rounded-md border border-line p-3">
        <p className="label-tech">QR colors</p>
        <div className="mt-2 grid gap-3">
          <ColorField label="Modules (dark)" value={c.qrDark} onChange={(v) => setColor("qrDark", v)} />
          <ColorField label="Plate (light)" value={c.qrLight} onChange={(v) => setColor("qrLight", v)} />
        </div>
        <p className={cn("mt-2 text-xs", contrast.verdict === "blocked" ? "text-destructive" : contrast.verdict === "warning" ? "text-neon-amber" : "text-emerald-400")}>
          Contrast {contrast.ratio.toFixed(1)}:1 · {contrast.verdict === "blocked" ? "unsafe" : contrast.verdict === "warning" ? "marginal" : contrast.verdict === "acceptable" ? "acceptable" : "ideal"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SAFE_QR_PAIRS.map((p) => (
            <button key={p.label} type="button" onClick={() => onChange((cfg) => ({ ...cfg, colors: { ...cfg.colors, qrDark: p.qrDark, qrLight: p.qrLight } }))} className="btn-ghost btn-small h-7 text-[10px]">
              <span className="inline-block size-2.5 rounded-sm border border-line" style={{ background: p.qrDark }} />
              <span className="inline-block size-2.5 rounded-sm border border-line" style={{ background: p.qrLight }} />
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function TextSection({ config, onChange }: { config: TagConfig; onChange: Props["onChange"] }) {
  const t = config.text;
  const setText = (patch: Partial<TagConfig["text"]>) => onChange((c) => ({ ...c, text: { ...c.text, ...patch } }));
  return (
    <>
      <Hint>Typography and the words on the decal.</Hint>
      <p className="field-label">Font</p>
      <div className="grid grid-cols-2 gap-1.5">
        {FONT_LIST.map((f) => (
          <button key={f.id} type="button" onClick={() => onChange({ font: f.id })} aria-pressed={config.font === f.id} className={cn("rounded-md border px-2 py-2 text-left", config.font === f.id ? "border-signal bg-signal/10" : "border-line hover:border-foreground/40")}>
            <span className="block text-lg leading-none uppercase" style={{ fontFamily: `'${f.family}', ${f.fallback}` }}>
              BUILDTAG
            </span>
            <span className="mt-1 block text-[10px] text-muted-foreground">{f.name}</span>
          </button>
        ))}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={t.logo} onChange={(e) => setText({ logo: e.target.checked })} className="size-4 accent-[#ff2d7a]" /> BuildTag wordmark
      </label>
      <label className="mt-3 block">
        <span className="field-label">Headline</span>
        <select value={t.headline} onChange={(e) => setText({ headline: e.target.value as TagConfig["text"]["headline"] })} className="field">
          <option value="none">None</option>
          <option value="whats-done">WHAT&apos;S DONE TO IT?</option>
          <option value="build-sheet">BUILD SHEET</option>
          <option value="custom">Custom…</option>
        </select>
      </label>
      {t.headline === "custom" && <input value={t.headlineCustom} maxLength={40} placeholder="Custom headline" onChange={(e) => setText({ headlineCustom: e.target.value })} className="field mt-2" aria-label="Custom headline" />}
      <label className="mt-3 block">
        <span className="field-label">Call to action</span>
        <select value={t.cta} onChange={(e) => setText({ cta: e.target.value as TagConfig["text"]["cta"] })} className="field">
          {CTA_PRESETS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {t.cta === "custom" && <input value={t.ctaCustom} maxLength={40} placeholder="Custom call to action" onChange={(e) => setText({ ctaCustom: e.target.value })} className="field mt-2" aria-label="Custom call to action" />}
      <label className="mt-3 block">
        <span className="field-label">Custom short text</span>
        <input value={t.custom} maxLength={40} placeholder="STAGE 2 · E85" onChange={(e) => setText({ custom: e.target.value })} className="field" />
      </label>
    </>
  );
}

function VehicleSection({ config, data, onChange }: { config: TagConfig; data: TagData; onChange: Props["onChange"] }) {
  const f = config.text.fields;
  const toggle = (key: keyof TextFields) => onChange((c) => ({ ...c, text: { ...c.text, fields: { ...c.text.fields, [key]: !c.text.fields[key] } } }));
  const rows: { key: keyof TextFields; label: string; value: string }[] = [
    { key: "year", label: "Year", value: data.year ? String(data.year) : "" },
    { key: "make", label: "Make", value: data.make },
    { key: "model", label: "Model", value: data.model },
    { key: "trim", label: "Trim", value: data.trim },
    { key: "nickname", label: "Nickname", value: data.nickname },
    { key: "power", label: "HP / WHP", value: data.powerLabel },
    { key: "torque", label: "Torque", value: data.torqueLabel },
    { key: "modCount", label: "Modification count", value: data.modCount ? `${data.modCount} mods` : "" },
    { key: "username", label: "BuildTag username", value: data.username ? `@${data.username}` : "" },
  ];
  return (
    <>
      <Hint>Values come from your build and stay in sync until you approve a proof.</Hint>
      <ul className="divide-y divide-line rounded-md border border-line">
        {rows.map((r) => (
          <li key={r.key}>
            <label className={cn("flex items-center gap-3 px-3 py-2 text-sm", !r.value && "opacity-50")}>
              <input type="checkbox" checked={f[r.key]} disabled={!r.value} onChange={() => toggle(r.key)} className="size-4 accent-[#ff2d7a]" />
              <span className="flex-1">{r.label}</span>
              <span className="truncate text-xs text-muted-foreground">{r.value || "not set"}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

function SocialSection({ config, data, onChange }: { config: TagConfig; data: TagData; onChange: Props["onChange"] }) {
  const setSocial = (patch: Partial<TagConfig["social"]>) => onChange((c) => ({ ...c, social: { ...c.social, ...patch } }));
  const enabled = config.text.fields.social;
  return (
    <>
      <Hint>One primary account on the decal. Vehicle accounts first, then yours. Hidden links never appear here.</Hint>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={() => onChange((c) => ({ ...c, text: { ...c.text, fields: { ...c.text.fields, social: !c.text.fields.social } } }))} className="size-4 accent-[#ff2d7a]" /> Show a social handle
      </label>
      {data.socials.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No public socials yet. Add one under the vehicle&apos;s Socials tab.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          <button type="button" onClick={() => setSocial({ source: "auto" })} className={cn("flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm", config.social.source === "auto" ? "border-signal bg-signal/10" : "border-line")}>
            Automatic (first vehicle account)
          </button>
          {data.socials.map((s) => (
            <button key={s.public_id} type="button" onClick={() => setSocial({ source: s.public_id })} className={cn("flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm", config.social.source === s.public_id ? "border-signal bg-signal/10" : "border-line")}>
              <svg viewBox="0 0 24 24" className="size-4 text-muted-foreground" aria-hidden="true">
                <path d={SOCIAL_GLYPHS[s.platform] ?? SOCIAL_GLYPHS.website} fill="currentColor" />
              </svg>
              <span className="flex-1">@{s.handle}</span>
              <span className="label-tech">{s.source}</span>
            </button>
          ))}
        </div>
      )}
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={config.social.showIcon} onChange={(e) => setSocial({ showIcon: e.target.checked })} className="size-4 accent-[#ff2d7a]" /> Platform icon before the handle
      </label>
    </>
  );
}

function BackgroundSection({ config, onChange }: { config: TagConfig; onChange: Props["onChange"] }) {
  const b = config.background;
  const setBg = (patch: Partial<TagConfig["background"]>) => onChange((c) => ({ ...c, background: { ...c.background, ...patch } }));
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <Hint>The QR always keeps an opaque plate, so photos and textures never touch scan contrast.</Hint>
      <Chips options={BACKGROUND_OPTIONS} value={b.kind} onChange={(v) => setBg({ kind: v as BackgroundKind })} />
      {b.kind === "image" && (
        <div className="mt-3 space-y-3">
          <label className="btn-ghost btn-small cursor-pointer">
            <Upload className="size-3.5" aria-hidden="true" /> {uploading ? "Uploading…" : b.imageUrl ? "Replace photo" : "Upload photo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setUploading(true);
                try {
                  setBg({ imageUrl: await uploadAsset(f, "background") });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          <label className="block">
            <span className="field-label">Darken photo ({Math.round(b.imageDim * 100)}%)</span>
            <input type="range" min={0} max={0.9} step={0.05} value={b.imageDim} onChange={(e) => setBg({ imageDim: Number(e.target.value) })} className="w-full accent-[#ff2d7a]" />
          </label>
        </div>
      )}
    </>
  );
}

function SizeSection({ config, onChange }: { config: TagConfig; onChange: Props["onChange"] }) {
  const s = config.size;
  const setSize = (size: TagConfig["size"]) => onChange({ size });
  const toUnit = (v: number, from: "in" | "mm", to: "in" | "mm") => (from === to ? v : to === "mm" ? Math.round(v * 25.4) : Math.round((v / 25.4) * 100) / 100);
  return (
    <>
      <Hint>Physical size of the finished decal. Orderable sizes are presets; custom sizes export as files only.</Hint>
      <div className="grid grid-cols-2 gap-2">
        {SIZE_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => setSize(sizeFromPreset(p.id, s.unit))} aria-pressed={s.id === p.id} className={cn("rounded-md border px-3 py-2 text-left", s.id === p.id ? "border-signal bg-signal/10" : "border-line hover:border-foreground/40")}>
            <span className="block font-display text-sm font-bold tracking-wider uppercase">{p.name}</span>
            <span className="block text-xs text-muted-foreground">
              {s.unit === "mm" ? `${Math.round(p.width * 25.4)} × ${Math.round(p.height * 25.4)} mm` : `${p.width} × ${p.height} in`} · {p.hint}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_88px] gap-2">
        <label className="block">
          <span className="field-label">Width</span>
          <input type="number" min={s.unit === "mm" ? 30 : 1.2} max={s.unit === "mm" ? 400 : 16} step={s.unit === "mm" ? 1 : 0.25} value={s.width} onChange={(e) => Number(e.target.value) > 0 && setSize({ ...s, id: "custom", width: Number(e.target.value) })} className="field" />
        </label>
        <label className="block">
          <span className="field-label">Height</span>
          <input type="number" min={s.unit === "mm" ? 30 : 1.2} max={s.unit === "mm" ? 400 : 16} step={s.unit === "mm" ? 1 : 0.25} value={s.height} onChange={(e) => Number(e.target.value) > 0 && setSize({ ...s, id: "custom", height: Number(e.target.value) })} className="field" />
        </label>
        <div>
          <span className="field-label">Units</span>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-1">
            {(["in", "mm"] as const).map((u) => (
              <button key={u} type="button" onClick={() => u !== s.unit && setSize({ ...s, unit: u, width: toUnit(s.width, s.unit, u), height: toUnit(s.height, s.unit, u) })} className={cn("h-8 rounded font-display text-xs font-bold uppercase", s.unit === u ? "bg-foreground text-background" : "text-muted-foreground")}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MaterialSection({ config, printSpecs, set }: { config: TagConfig; printSpecs: PrintSpecificationRow[]; set: <K extends keyof TagConfig>(k: K, v: TagConfig[K]) => void }) {
  const availableFor = (m: MaterialId) => printSpecs.some((s) => s.material === m && s.available && s.provider_sku);
  return (
    <>
      <Hint>Finish previews. Only materials with a configured print SKU can be ordered; the rest are previews until a partner carries them.</Hint>
      <div className="space-y-1.5">
        {MATERIALS.map((m) => {
          const avail = availableFor(m.id);
          return (
            <button key={m.id} type="button" onClick={() => set("material", m.id)} aria-pressed={config.material === m.id} className={cn("flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left", config.material === m.id ? "border-signal bg-signal/10" : "border-line hover:border-foreground/40")}>
              <span className="flex-1">
                <span className="block font-display text-xs font-bold tracking-wider uppercase">{m.name}</span>
                <span className="block text-[11px] text-muted-foreground">{m.description}</span>
              </span>
              <span className={cn("rounded border px-1.5 py-0.5 font-display text-[9px] font-bold tracking-[0.16em] uppercase", avail ? "border-emerald-500/50 text-emerald-400" : "border-neon-amber/60 text-neon-amber")}>{avail ? "Available" : "Preview"}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function AdvancedSection({ config, onChange, autosave, onAutosave }: { config: TagConfig; onChange: Props["onChange"]; autosave: boolean; onAutosave: (v: boolean) => void }) {
  const a = config.advanced;
  const setAdv = (patch: Partial<TagConfig["advanced"]>) => onChange((c) => ({ ...c, advanced: { ...c.advanced, ...patch } }));
  return (
    <>
      <label className="block">
        <span className="field-label">Text scale ({Math.round(a.textScale * 100)}%)</span>
        <input type="range" min={0.7} max={1.3} step={0.05} value={a.textScale} onChange={(e) => setAdv({ textScale: Number(e.target.value) })} className="w-full accent-[#ff2d7a]" />
      </label>
      <label className="mt-3 block">
        <span className="field-label">Decoration opacity ({Math.round(a.decorOpacity * 100)}%)</span>
        <input type="range" min={0} max={1} step={0.05} value={a.decorOpacity} onChange={(e) => setAdv({ decorOpacity: Number(e.target.value) })} className="w-full accent-[#ff2d7a]" />
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={a.border} onChange={(e) => setAdv({ border: e.target.checked })} className="size-4 accent-[#ff2d7a]" /> Accent border inside the cut line
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={autosave} onChange={(e) => onAutosave(e.target.checked)} className="size-4 accent-[#ff2d7a]" /> Autosave saved designs
      </label>
    </>
  );
}

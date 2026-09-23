"use client";

import { BadgeDollarSign, ExternalLink, Link2 } from "lucide-react";
import { useState } from "react";

import { AFFILIATE_PROGRAMS, detectAffiliate } from "@/lib/affiliate";
import type { ModificationRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Summary strip at the top of the modifications editor
 * ------------------------------------------------------------------------- */

export function MonetizeSummary({ mods, onAddLink }: { mods: ModificationRow[]; onAddLink: () => void }) {
  const total = mods.length;
  const monetized = mods.filter((m) => !!m.affiliate_url).length;
  const linkedOnly = mods.filter((m) => !m.affiliate_url && !!m.product_url).length;
  const pct = total ? Math.round((monetized / total) * 100) : 0;

  return (
    <section className="rounded-lg border border-signal/40 bg-[linear-gradient(120deg,rgba(255,45,122,0.14),rgba(31,216,255,0.06)_60%,transparent)] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-signal">Earn from your parts list</p>
          <h3 className="mt-1 text-2xl">
            {total === 0 ? "Every part can pay you back." : monetized === 0 ? "None of your parts are earning yet." : `${monetized} of ${total} parts are earning.`}
          </h3>
          <p className="mt-1 max-w-xl text-sm text-foreground/80">
            Paste your affiliate link on a part and every <span className="font-semibold text-foreground">View part</span> tap from a scan goes through it. People who scan your car are already asking what it is and where to get it.
            {linkedOnly > 0 && ` ${linkedOnly} part${linkedOnly === 1 ? " has" : "s have"} a plain link you could swap for an affiliate one.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <p className="font-display text-4xl leading-none font-extrabold text-signal tabular-nums">{pct}%</p>
            <p className="label-tech mt-1">monetized</p>
          </div>
          {total > monetized && (
            <button type="button" onClick={onAddLink} className="btn-signal btn-small">
              <BadgeDollarSign className="size-4" aria-hidden="true" />
              Add a link
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded bg-background/60">
        <div className="h-full bg-signal transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <HowToEarn />
    </section>
  );
}

function HowToEarn() {
  return (
    <details className="group mt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold select-none [&::-webkit-details-marker]:hidden">
        <span className="font-display text-lg text-signal transition-transform group-open:rotate-45">+</span>
        How to get affiliate links (takes about ten minutes)
      </summary>
      <ol className="mt-3 grid gap-2 text-sm text-foreground/80 sm:grid-cols-2">
        {AFFILIATE_PROGRAMS.map((p, i) => (
          <li key={p.id} className="rounded-md border border-line bg-background/50 p-3">
            <p className="font-display text-base font-bold tracking-wide uppercase">
              <span className="mr-2 text-signal">{i + 1}</span>
              {p.signupUrl ? (
                <a href={p.signupUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-signal">
                  {p.name}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                p.name
              )}
            </p>
            <p className="mt-1">{p.fit}</p>
            <p className="mt-1 text-xs text-muted-foreground">Looks like: {p.looksLike}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Sign up, search the program for the part, copy the tracking link it gives you, paste it here. BuildTag adds the affiliate disclosure to your public page automatically, and takes no cut.
      </p>
    </details>
  );
}

/* ---------------------------------------------------------------------------
 * Row badge
 * ------------------------------------------------------------------------- */

export function EarnBadge({ mod, onAdd }: { mod: ModificationRow; onAdd: () => void }) {
  if (mod.affiliate_url) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-signal/50 bg-signal/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-signal uppercase">
        <BadgeDollarSign className="size-3" aria-hidden="true" />
        Earning
      </span>
    );
  }
  if (mod.product_url) {
    return (
      <button type="button" onClick={onAdd} title="Swap for an affiliate link" className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase hover:border-signal/50 hover:text-signal">
        <Link2 className="size-3" aria-hidden="true" />
        Link
      </button>
    );
  }
  return (
    <button type="button" onClick={onAdd} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase hover:border-signal/50 hover:text-signal">
      + Earn
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * Link block inside the edit dialog
 * ------------------------------------------------------------------------- */

export function EarnBlock({ mod, errors }: { mod: ModificationRow; errors: Record<string, string> }) {
  const [affiliate, setAffiliate] = useState(mod.affiliate_url ?? "");
  const [network, setNetwork] = useState(mod.affiliate_network);
  const detection = detectAffiliate(affiliate);
  const showPlainWarning = affiliate.trim().length > 0 && !detection.tracked;

  return (
    <div className="rounded-lg border border-signal/40 bg-signal/5 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-bold tracking-wider uppercase">
          <BadgeDollarSign className="mr-1 inline size-4 text-signal" aria-hidden="true" />
          Earn from this part
        </p>
        {detection.tracked && <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-signal uppercase">{detection.label}</span>}
      </div>
      <label className="mt-3 block">
        <span className="field-label">Affiliate link</span>
        <input
          name="affiliate_url"
          type="url"
          inputMode="url"
          value={affiliate}
          onChange={(e) => {
            const v = e.target.value;
            setAffiliate(v);
            const d = detectAffiliate(v);
            if (d.network && d.network !== "custom") setNetwork(d.network);
          }}
          placeholder="https://amzn.to/… or the link your program gave you"
          className={cn("field", showPlainWarning && "border-neon-amber/60")}
        />
        {errors.affiliate_url ? (
          <span className="field-error">{errors.affiliate_url}</span>
        ) : showPlainWarning ? (
          <span className="mt-1 block text-xs text-neon-amber">This looks like a plain product page. It will still work, but nothing tracks back to you. Paste the link from your affiliate dashboard instead.</span>
        ) : (
          <span className="mt-1 block text-xs text-muted-foreground">Used for View part on your public page. Your visitors see the disclosure; you keep the commission.</span>
        )}
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Program</span>
          <input name="affiliate_network" value={network} onChange={(e) => setNetwork(e.target.value)} maxLength={80} placeholder="Detected automatically" className="field" />
        </label>
        <label className="block">
          <span className="field-label">Merchant</span>
          <input name="merchant" defaultValue={mod.merchant} maxLength={80} placeholder="Amazon, eBay, brand site" className="field" />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="field-label">
          Plain product link <span className="normal-case tracking-normal">(fallback, no commission)</span>
        </span>
        <input name="product_url" type="url" inputMode="url" defaultValue={mod.product_url ?? ""} placeholder="https://" className="field" />
        {errors.product_url && <span className="field-error">{errors.product_url}</span>}
      </label>
    </div>
  );
}

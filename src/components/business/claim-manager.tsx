"use client";

import { Copy, Mail, Printer, RotateCcw, Send, XCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { generateClaimAction, revokeClaimAction, sendClaimInviteAction } from "@/lib/actions/business";
import { qrSvg } from "@/lib/qr/generate";
import type { GeneratedClaim, OrgClaimSummary } from "@/lib/types";

type Fresh = GeneratedClaim & { url: string };

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
}

/**
 * Claim handoff for one unclaimed build. The link and code are shown once,
 * right after they're generated: the database keeps only hashes, so a lost
 * link means generating a new one (which cancels the old).
 */
export function ClaimManager({
  vehicleId,
  vehicleLabel,
  vehicleSub,
  orgName,
  claim,
  claimed,
  defaultEmail,
  claimHost,
  initialFresh = null,
}: {
  vehicleId: string;
  vehicleLabel: string;
  vehicleSub: string;
  orgName: string;
  claim: OrgClaimSummary | null;
  claimed: boolean;
  defaultEmail: string;
  /** e.g. buildtags.app, for the typed-code instruction on the card */
  claimHost: string;
  /** A claim generated just before render (e.g. right after creating the build). */
  initialFresh?: Fresh | null;
}) {
  const [fresh, setFresh] = useState<Fresh | null>(initialFresh);
  const [email, setEmail] = useState(defaultEmail);
  const [days, setDays] = useState(60);
  const [pending, start] = useTransition();
  const active = claim?.status === "active";

  const qr = useMemo(() => (fresh ? qrSvg(fresh.url, 220) : null), [fresh]);

  if (claimed) {
    return (
      <div className="panel p-5">
        <h3 className="text-xl">Claimed</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The customer owns this build now{claim?.claimed_at ? ` (since ${fmt(claim.claimed_at)})` : ""}. Parts {orgName} recorded stay credited
          to you on the public page.
        </p>
      </div>
    );
  }

  const generate = () =>
    start(async () => {
      const form = new FormData();
      form.set("expires_in_days", String(days));
      form.set("recipient_email", email);
      const res = await generateClaimAction(vehicleId, form);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFresh(res.data);
      toast.success(active ? "New claim link ready. The old one no longer works." : "Claim link ready");
    });

  const revoke = () => {
    if (!claim || !window.confirm("Cancel the current claim link? The customer won't be able to use it.")) return;
    start(async () => {
      const res = await revokeClaimAction(claim.id);
      if (!res.ok) toast.error(res.error);
      else {
        setFresh(null);
        toast.success("Claim link cancelled");
      }
    });
  };

  const sendInvite = () => {
    if (!fresh) return;
    start(async () => {
      const res = await sendClaimInviteAction({ claimId: fresh.claim_id, token: fresh.token, email });
      if (!res.ok) toast.error(res.error);
      else toast.success(`Claim link sent to ${email}`);
    });
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Couldn't copy. Select it and copy manually.");
    }
  };

  return (
    <div className="panel space-y-5 p-5">
      <div>
        <h3 className="text-xl">Customer handoff</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Give the customer a private claim link or card. Claiming moves the build into their garage. The QR on the vehicle doesn&apos;t
          change and never grants ownership on its own.
        </p>
      </div>

      {active && !fresh && (
        <div className="rounded-md border border-signal/40 bg-signal/10 p-3 text-sm">
          <p>
            A claim link is out (code ending <span className="font-mono">{claim.code_hint}</span>
            {claim.expires_at ? `, works until ${fmt(claim.expires_at)}` : ""}
            {claim.invite_sent_at ? `, emailed ${fmt(claim.invite_sent_at)}` : ""}).
          </p>
          <p className="mt-1 text-muted-foreground">For security the full link is only shown when it&apos;s created. Lost it? Generate a new one; the old one stops working.</p>
        </div>
      )}
      {claim?.status === "expired" && !fresh && <p className="text-sm text-muted-foreground">The last claim link expired. Generate a new one.</p>}

      {!fresh && (
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <div>
            <label htmlFor="claim-email" className="field-label">
              Customer email <span className="normal-case tracking-normal">(for the invite, optional)</span>
            </label>
            <input id="claim-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="claim-days" className="field-label">
              Expires in
            </label>
            <select id="claim-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className="field">
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
          <button type="button" className="btn-signal" onClick={generate} disabled={pending}>
            {active ? <RotateCcw className="size-4" aria-hidden="true" /> : null}
            {active ? "New claim link" : "Generate claim link"}
          </button>
        </div>
      )}

      {fresh && qr && (
        <div className="space-y-4">
          <p className="rounded-md border border-neon-amber/50 bg-neon-amber/10 px-3 py-2 text-sm">
            Save or send this now. The full link and code won&apos;t be shown again.
          </p>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div>
                <p className="field-label">Private claim link</p>
                <div className="flex gap-2">
                  <input readOnly value={fresh.url} className="field font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Claim link" />
                  <button type="button" className="btn-ghost btn-small shrink-0" onClick={() => copy(fresh.url, "Link")}>
                    <Copy className="size-4" aria-hidden="true" />
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <p className="field-label">Claim code</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl tracking-[0.18em]">{fresh.code}</span>
                  <button type="button" className="btn-ghost btn-small" onClick={() => copy(fresh.code, "Code")}>
                    <Copy className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Customer can also sign in at {claimHost}/claim and type it. Works until {fmt(fresh.expires_at) ?? "cancelled"}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost btn-small" onClick={() => window.print()}>
                  <Printer className="size-4" aria-hidden="true" />
                  Print claim card
                </button>
                <a className="btn-ghost btn-small" href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Your ${vehicleLabel} build is ready`)}&body=${encodeURIComponent(`Claim your build page here: ${fresh.url}`)}`}>
                  <Mail className="size-4" aria-hidden="true" />
                  Open in my email
                </a>
              </div>
            </div>
            <div className="rounded-md bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label htmlFor="invite-email" className="field-label">
                Send the invite from BuildTag
              </label>
              <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" className="field" autoComplete="off" />
            </div>
            <button type="button" className="btn-signal" onClick={sendInvite} disabled={pending || !email}>
              <Send className="size-4" aria-hidden="true" />
              Email claim link
            </button>
          </div>
          <ClaimCard qr={qr} code={fresh.code} vehicleLabel={vehicleLabel} vehicleSub={vehicleSub} orgName={orgName} expires={fmt(fresh.expires_at)} claimHost={claimHost} />
        </div>
      )}

      {(active || fresh) && (
        <button type="button" onClick={revoke} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive" disabled={pending}>
          <XCircle className="size-4" aria-hidden="true" />
          Cancel claim link
        </button>
      )}
    </div>
  );
}

/** Printable card (hidden on screen, the only thing printed). */
function ClaimCard({ qr, code, vehicleLabel, vehicleSub, orgName, expires, claimHost }: { qr: string; code: string; vehicleLabel: string; vehicleSub: string; orgName: string; expires: string | null; claimHost: string }) {
  return (
    <>
      <style>{`
        #claim-card { display: none; }
        @media print {
          @page { size: 5in 3.5in; margin: 0; }
          body * { visibility: hidden !important; }
          #claim-card, #claim-card * { visibility: visible !important; }
          #claim-card { display: flex !important; position: fixed; inset: 0; }
        }
      `}</style>
      <div id="claim-card" style={{ width: "5in", height: "3.5in", background: "#fff", color: "#111", padding: "0.3in", boxSizing: "border-box", gap: "0.25in", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "9pt", letterSpacing: "2px", textTransform: "uppercase", color: "#666" }}>BuildTag · from {orgName}</div>
          <div style={{ fontSize: "22pt", fontWeight: 800, lineHeight: 1, marginTop: "8pt", textTransform: "uppercase" }}>Your build is ready</div>
          <div style={{ fontSize: "12pt", fontWeight: 700, marginTop: "8pt" }}>{vehicleLabel}</div>
          <div style={{ fontSize: "9pt", color: "#444" }}>{vehicleSub}</div>
          <div style={{ marginTop: "auto", fontSize: "8.5pt", lineHeight: 1.35 }}>
            Scan to claim it, or sign in at <b>{claimHost}/claim</b> and enter:
            <div style={{ fontFamily: "Courier New, monospace", fontSize: "15pt", fontWeight: 700, letterSpacing: "2px", margin: "4pt 0" }}>{code}</div>
            {expires ? `Works until ${expires}. ` : ""}Keep this card private until you&apos;ve claimed your build.
          </div>
        </div>
        <div style={{ width: "1.55in", display: "flex", alignItems: "center" }} dangerouslySetInnerHTML={{ __html: qr.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"') }} />
      </div>
    </>
  );
}

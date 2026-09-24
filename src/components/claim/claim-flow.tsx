"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { claimVehicleAction } from "@/lib/actions/claims";
import { CLAIM_ERROR_MESSAGE, looksLikeClaimCode } from "@/lib/claims";
import type { ClaimResult } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ClaimWelcome } from "./claim-welcome";

type Success = Extract<ClaimResult, { ok: true }>;

/**
 * CLAIM MY BUILD → confirm → claim → WELCOME TO YOUR BUILD.
 * Token mode (from the private link) or code mode (typed from the card).
 */
export function ClaimFlow({
  token,
  vehicleLabel,
  orgName,
  username,
  children,
}: {
  /** Omit for code entry. */
  token?: string;
  vehicleLabel?: string;
  orgName?: string | null;
  username: string;
  /** The preview shown above the button (token mode). */
  children?: React.ReactNode;
}) {
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Success | null>(null);
  const [pending, start] = useTransition();

  if (done) return <ClaimWelcome result={done} />;

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await claimVehicleAction(token ? { token } : { code });
      setConfirming(false);
      if (res.ok) {
        setDone(res);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(CLAIM_ERROR_MESSAGE[res.error]);
      }
    });
  };

  return (
    <div>
      {children}

      {!token && (
        <form
          className="panel mt-6 max-w-md space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!looksLikeClaimCode(code)) {
              setError("Claim codes look like BT-XXXX-XXXX. Check the card from your shop.");
              return;
            }
            setError(null);
            setConfirming(true);
          }}
        >
          <label htmlFor="claim-code" className="field-label">
            Claim code
          </label>
          <input
            id="claim-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="BT-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            className="field font-mono text-lg tracking-[0.2em] uppercase"
          />
          <button type="submit" className="btn-signal w-full" disabled={pending || code.trim().length < 8}>
            Continue
          </button>
        </form>
      )}

      {token && (
        <button type="button" className="btn-signal mt-8 w-full sm:w-auto sm:px-10" onClick={() => setConfirming(true)} disabled={pending}>
          Claim my build
        </button>
      )}

      {error && (
        <p role="alert" className="mt-4 max-w-md rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <Dialog open={confirming} onOpenChange={(o) => !pending && setConfirming(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Claim this build?</DialogTitle>
            <DialogDescription>
              {vehicleLabel ? `${vehicleLabel} ` : "This build "}moves into the garage of <strong>@{username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-foreground/85">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              You become the owner. You control the page, photos and privacy.
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              {orgName ? `${orgName} keeps credit for the parts they recorded.` : "The shop keeps credit for the parts they recorded."} You can hide
              any of them from your public page.
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              The QR code on the vehicle stays the same.
            </li>
          </ul>
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Not yet
            </button>
            <button type="button" className="btn-signal" onClick={submit} disabled={pending}>
              {pending ? "Claiming…" : "Yes, claim it"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

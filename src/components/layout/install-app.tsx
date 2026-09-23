"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const DISMISS_KEY = "bt-install-dismissed";

type Platform = "ios" | "android" | "desktop";
type Mode = "native" | "ios-steps" | "hint";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Offers the BuildTag app right after sign-up (and quietly afterwards until
 * dismissed). Chrome/Edge/Samsung get the real install prompt; iPhones get
 * the two-tap Share -> Add to Home Screen steps, since Safari has no prompt.
 *
 * `welcome` forces the big card once even if it was dismissed before.
 */
export function InstallAppPrompt({ welcome = false, className }: { welcome?: boolean; className?: string }) {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [mode, setMode] = useState<Mode>("hint");
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed && !welcome) return;

    const p = detectPlatform();
    const decide = () => {
      if (window.__btInstallPrompt) setMode("native");
      else if (p === "ios") setMode("ios-steps");
      else setMode("hint");
    };
    // Decide after mount (not synchronously in the effect) so the server and
    // first client render agree, then reveal the card.
    const reveal = window.setTimeout(() => {
      setPlatform(p);
      decide();
      setVisible(true);
    }, 0);
    const onInstallable = () => decide();
    const onInstalled = () => setVisible(false);
    window.addEventListener("bt:installable", onInstallable);
    window.addEventListener("bt:installed", onInstalled);
    return () => {
      window.clearTimeout(reveal);
      window.removeEventListener("bt:installable", onInstallable);
      window.removeEventListener("bt:installed", onInstalled);
    };
  }, [welcome]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const install = async () => {
    const ev = window.__btInstallPrompt;
    if (!ev) return;
    setInstalling(true);
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice.outcome === "accepted") {
        window.__btInstallPrompt = null;
        setVisible(false);
      }
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  // Desktop browsers without a prompt (Firefox, Safari) get nothing unless it is the welcome moment.
  if (mode === "hint" && platform === "desktop" && !welcome) return null;

  return (
    <section
      aria-label="Install the BuildTag app"
      className={cn(
        "relative overflow-hidden rounded-lg border border-neon-cyan/40 bg-[linear-gradient(120deg,rgba(31,216,255,0.14),rgba(255,45,122,0.08)_60%,transparent)]",
        welcome ? "p-5 sm:p-6" : "p-4",
        className,
      )}
    >
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground">
        <X className="size-4" />
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl border border-line shadow-[0_0_24px_-6px_var(--neon-cyan)]" />
        <div className="min-w-0 flex-1 pr-8">
          {welcome ? (
            <>
              <p className="eyebrow text-neon-cyan">You&apos;re in</p>
              <h2 className="mt-1 text-2xl">Put BuildTag on your home screen</h2>
              <p className="mt-1 text-sm text-foreground/80">One tap to your garage, analytics and the designer. No app store, no update nags, works offline for the basics.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl">Get the BuildTag app</h2>
              <p className="mt-0.5 text-sm text-foreground/80">Add it to your home screen for one-tap access to your garage.</p>
            </>
          )}

          {mode === "ios-steps" && (
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <li className="flex items-center gap-2 rounded-md border border-line bg-background/60 px-3 py-2">
                <span className="font-display text-lg font-bold text-neon-cyan">1</span>
                Tap <Share className="size-4" aria-label="Share" /> <span className="font-semibold">Share</span> in Safari
              </li>
              <li className="flex items-center gap-2 rounded-md border border-line bg-background/60 px-3 py-2">
                <span className="font-display text-lg font-bold text-neon-cyan">2</span>
                Tap <SquarePlus className="size-4" aria-hidden="true" /> <span className="font-semibold">Add to Home Screen</span>
              </li>
            </ol>
          )}
          {mode === "hint" && platform !== "ios" && (
            <p className="mt-3 text-sm text-muted-foreground">
              {platform === "android" ? "Open the browser menu and choose Install app or Add to Home screen." : "On your phone, open buildtags.app in Safari or Chrome and choose Add to Home Screen."}
            </p>
          )}
        </div>
        {mode === "native" && (
          <button type="button" onClick={install} disabled={installing} className="btn-signal shrink-0">
            <Download className="size-4" aria-hidden="true" />
            {installing ? "Installing…" : "Install app"}
          </button>
        )}
        {mode !== "native" && !welcome && (
          <button type="button" onClick={dismiss} className="btn-ghost btn-small shrink-0">
            Got it
          </button>
        )}
      </div>
    </section>
  );
}

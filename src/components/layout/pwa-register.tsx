"use client";

import { useEffect } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    /** The deferred install prompt, captured as early as possible so a later screen can use it. */
    __btInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

/**
 * Registers the service worker in production so BuildTag is installable, and
 * catches the browser's install prompt the moment it fires (it often fires
 * before the screen that wants to show it has mounted).
 */
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__btInstallPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new CustomEvent("bt:installable"));
    };
    const onInstalled = () => {
      window.__btInstallPrompt = null;
      window.dispatchEvent(new CustomEvent("bt:installed"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Installability is progressive enhancement; failures are non-fatal.
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

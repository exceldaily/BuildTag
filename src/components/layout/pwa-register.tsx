"use client";

import { useEffect } from "react";

/** Registers the service worker in production so BuildTag is installable. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installability is progressive enhancement; failures are non-fatal.
    });
  }, []);
  return null;
}

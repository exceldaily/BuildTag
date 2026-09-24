"use client";

import { useEffect } from "react";

/**
 * Pointer and scroll depth for the hero. Writes three CSS variables on the
 * hero element inside requestAnimationFrame (no React state):
 *   --dx, --dy  pointer offset from center, -1..1 (eased)
 *   --sy        scroll distance while the hero is on screen, in px
 * Layers turn these into a few pixels of movement. Off for touch and
 * reduced motion.
 */
export function HeroDepth({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reduce.matches) return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let last = -1;

    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty("--dx", x.toFixed(4));
      el.style.setProperty("--dy", y.toFixed(4));
      const sy = Math.min(Math.max(window.scrollY, 0), el.offsetHeight);
      if (sy !== last) {
        el.style.setProperty("--sy", `${sy}px`);
        last = sy;
      }
      raf = Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (!fine.matches || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    const onScroll = () => {
      if (window.scrollY <= el.offsetHeight + 200) kick();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetId]);
  return null;
}

"use client";

import type { MockupPlacement, MockupTone } from "./designer-preview";

/**
 * Approximate "on the car" preview. The coupe silhouette is ~180 inches
 * long and drawn 1000 units wide, so a decal of `widthIn` inches maps to
 * roughly widthIn * (1000 / 180) units. Visual only.
 */
const UNITS_PER_INCH = 1000 / 180;

const PLACEMENTS: Record<MockupPlacement, { x: number; y: number; label: string }> = {
  "rear-window": { x: 300, y: 128, label: "Rear window" },
  "quarter-window": { x: 246, y: 150, label: "Quarter window" },
  bumper: { x: 118, y: 262, label: "Rear bumper" },
  "body-panel": { x: 210, y: 220, label: "Rear quarter panel" },
};

export function CarMockup({ svg, aspect, placement, tone, widthIn }: { svg: string; aspect: number; placement: MockupPlacement; tone: MockupTone; widthIn: number }) {
  const w = Math.max(40, Math.min(260, widthIn * UNITS_PER_INCH * 1.6));
  const h = w * aspect;
  const p = PLACEMENTS[placement];
  const body = tone === "dark" ? "#17141f" : "#e8e6ef";
  const bodyStroke = tone === "dark" ? "#3b3554" : "#9a97ab";
  const glass = tone === "dark" ? "#0d0b16" : "#3a3f52";
  const ground = tone === "dark" ? "#0b0916" : "#d3d0dc";

  return (
    <div className="relative mx-auto max-w-[680px] overflow-hidden rounded-md" style={{ background: tone === "dark" ? "radial-gradient(ellipse at 50% 30%, #1d1836, #06050d 70%)" : "radial-gradient(ellipse at 50% 30%, #ffffff, #cfcbdc 70%)" }}>
      <svg viewBox="0 0 1000 360" className="w-full" role="img" aria-label={`Decal placed on the ${p.label.toLowerCase()} of a coupe`}>
        <rect x="0" y="300" width="1000" height="60" fill={ground} />
        {/* body: rear three-quarter-ish side profile, rear on the left */}
        <path d="M60 268 L86 210 Q110 170 170 158 L300 128 Q380 96 470 100 L640 112 Q760 122 850 176 L900 200 Q960 214 962 246 L962 270 Q962 292 936 292 L84 292 Q60 292 60 276 Z" fill={body} stroke={bodyStroke} strokeWidth="3" />
        {/* glasshouse */}
        <path d="M296 134 L470 108 Q560 104 650 118 L664 160 L300 168 Z" fill={glass} stroke={bodyStroke} strokeWidth="2" />
        <path d="M470 108 L470 166" stroke={bodyStroke} strokeWidth="2" />
        {/* rear window shape (left-facing) */}
        <path d="M296 134 L300 168 L392 164 L410 118 Z" fill={tone === "dark" ? "#120f1d" : "#4b5068"} stroke={bodyStroke} strokeWidth="2" />
        {/* trim line */}
        <path d="M100 232 L940 232" stroke="#ff2d7a" strokeWidth="3" opacity="0.8" />
        {/* tail light */}
        <rect x="66" y="212" width="18" height="14" rx="3" fill="#ff2d7a" />
        {/* wheels */}
        {[230, 780].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="290" r="48" fill="#06050d" stroke={bodyStroke} strokeWidth="5" />
            <circle cx={cx} cy="290" r="27" fill={tone === "dark" ? "#141127" : "#c9c6d6"} stroke="#8f8aa8" strokeWidth="3" />
            {[0, 72, 144, 216, 288].map((a) => (
              <line key={a} x1={cx} y1="290" x2={cx + Math.cos((a * Math.PI) / 180) * 24} y2={290 + Math.sin((a * Math.PI) / 180) * 24} stroke="#8f8aa8" strokeWidth="4" />
            ))}
          </g>
        ))}
        {/* decal drop shadow */}
        <rect x={p.x + 3} y={p.y + 4} width={w} height={h} rx="4" fill="#000" opacity="0.35" />
      </svg>
      <div
        className="absolute"
        style={{ left: `${(p.x / 1000) * 100}%`, top: `${(p.y / 360) * 100}%`, width: `${(w / 1000) * 100}%`, filter: "drop-shadow(0 0 6px rgba(0,0,0,0.5))" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="absolute right-2 bottom-2 rounded bg-background/80 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.18em] uppercase">{p.label}</span>
    </div>
  );
}

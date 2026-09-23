import { qrSvg } from "@/lib/qr/generate";

/**
 * "Car + decal + phone" concept illustration in night-street style: a
 * lowered coupe with neon underglow wearing a BuildTag, and a phone showing
 * the scanned build. Pure SVG/CSS.
 */
export function ConceptShowcase() {
  const qr = qrSvg("https://buildtag.example/s/DEMO2K22", 120, "#000000", "#ffffff");

  return (
    <div className="relative mx-auto w-full max-w-md md:max-w-none" aria-label="A modified car with a BuildTag decal and a phone showing the scanned build">
      <div className="neon-card relative overflow-hidden p-4 sm:p-6">
        <svg viewBox="0 0 640 320" className="w-full" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="body" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#2b2650" />
              <stop offset="0.55" stopColor="#141127" />
              <stop offset="1" stopColor="#0a0814" />
            </linearGradient>
            <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#ff2d7a" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ff2d7a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glowc" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#1fd8ff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#1fd8ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* wet ground + underglow */}
          <rect x="0" y="236" width="640" height="84" fill="#08070f" />
          <ellipse cx="330" cy="246" rx="290" ry="26" fill="url(#glow)" />
          <ellipse cx="330" cy="262" rx="200" ry="40" fill="#ff2d7a" opacity="0.08" />
          {/* body */}
          <path
            d="M70 215 L95 160 Q120 120 175 110 L260 96 Q300 88 340 96 L420 112 Q470 122 520 160 L560 180 Q590 190 590 212 L590 226 Q590 236 578 236 L82 236 Q70 236 70 224 Z"
            fill="url(#body)"
            stroke="#4a4470"
            strokeWidth="2"
          />
          {/* glass */}
          <path d="M190 118 L262 104 Q300 97 336 104 L404 117 L378 152 L212 152 Z" fill="#0a0814" stroke="#3b3560" strokeWidth="2" />
          <path d="M296 104 L296 152" stroke="#3b3560" strokeWidth="2" />
          <path d="M200 120 L250 108 L246 112 L206 124 Z" fill="#1fd8ff" opacity="0.25" />
          {/* neon side line + wrap accent */}
          <path d="M100 196 L560 196" stroke="#ff2d7a" strokeWidth="3" />
          <path d="M100 200 L560 200" stroke="#ff2d7a" strokeWidth="6" opacity="0.25" />
          {/* headlight + tail */}
          <path d="M556 178 L588 190 L586 200 L552 190 Z" fill="#1fd8ff" opacity="0.9" />
          <path d="M588 190 L640 176 L640 214 L590 204 Z" fill="url(#glowc)" opacity="0.5" />
          <rect x="72" y="184" width="14" height="10" rx="2" fill="#ff2d7a" />
          <path d="M72 184 L0 170 L0 210 L72 194 Z" fill="url(#glow)" opacity="0.6" />
          {/* wheels */}
          {[160, 470].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="228" r="36" fill="#06050d" stroke="#3b3560" strokeWidth="4" />
              <circle cx={cx} cy="228" r="21" fill="#141127" stroke="#8f8aa8" strokeWidth="2" />
              {[0, 72, 144, 216, 288].map((a) => (
                <line key={a} x1={cx} y1="228" x2={cx + Math.cos((a * Math.PI) / 180) * 19} y2={228 + Math.sin((a * Math.PI) / 180) * 19} stroke="#8f8aa8" strokeWidth="3" />
              ))}
              <circle cx={cx} cy="228" r="4" fill="#ff2d7a" />
            </g>
          ))}
          {/* reflection */}
          <g opacity="0.18" transform="translate(0 472) scale(1 -1)">
            <path d="M70 215 L95 160 Q120 120 175 110 L260 96 Q300 88 340 96 L420 112 Q470 122 520 160 L560 180 Q590 190 590 212 L590 226 Q590 236 578 236 L82 236 Q70 236 70 224 Z" fill="#8b5cf6" />
          </g>
          {/* BuildTag decal on the rear quarter */}
          <g transform="translate(486 130)">
            <rect x="-3" y="-3" width="64" height="78" rx="6" fill="#ff2d7a" opacity="0.55" />
            <rect x="0" y="0" width="58" height="72" rx="4" fill="#ffffff" />
            <g transform="translate(8 8) scale(0.35)" dangerouslySetInnerHTML={{ __html: qr.replace(/<svg[^>]*>|<\/svg>/g, "") }} />
            <text x="29" y="63" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="6.5" fill="#06050d">
              SCAN THE BUILD
            </text>
          </g>
          {/* scan beam */}
          <path d="M515 130 L600 40" stroke="#1fd8ff" strokeWidth="2" strokeDasharray="6 5" opacity="0.9" />
        </svg>

        {/* Phone */}
        <div className="absolute top-4 right-4 w-[120px] rounded-[18px] border border-neon-cyan/40 bg-[#06050d] p-1.5 shadow-[0_0_30px_-8px_var(--neon-cyan)] sm:top-6 sm:right-6 sm:w-[150px]">
          <div className="overflow-hidden rounded-[13px] bg-[#0d0b18]">
            <div className="h-14 bg-[radial-gradient(circle_at_30%_30%,#3b3560,#0d0b18)] sm:h-20" />
            <div className="space-y-1 p-2">
              <p className="font-display text-[8px] font-semibold tracking-[0.18em] text-signal uppercase">2022 Toyota</p>
              <p className="font-display text-[13px] leading-none font-bold uppercase sm:text-[15px]">GR Supra</p>
              <div className="grid grid-cols-3 gap-1 pt-1">
                {[
                  ["612", "WHP"],
                  ["574", "WTQ"],
                  ["37", "MODS"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded bg-[#06050d] px-1 py-1 text-center">
                    <p className="font-display text-[11px] leading-none font-bold text-neon-cyan">{v}</p>
                    <p className="text-[6px] tracking-[0.15em] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 pt-1">
                {["Pure800 Turbo", "KW V3 Coilovers", "Volk TE37"].map((m) => (
                  <div key={m} className="flex items-center gap-1">
                    <span className="size-1 rounded-full bg-signal" />
                    <span className="text-[7px] text-foreground/80">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="label-tech mt-3 text-center">Decal on the car. Build sheet on the phone.</p>
    </div>
  );
}

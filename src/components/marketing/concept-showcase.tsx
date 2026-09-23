import { qrSvg } from "@/lib/qr/generate";

/**
 * "Car + decal + phone" concept illustration. Pure SVG/CSS so it loads
 * instantly and reads in about five seconds: a car silhouette wearing a
 * BuildTag, a phone showing the scanned build.
 */
export function ConceptShowcase() {
  const qr = qrSvg("https://buildtag.example/s/DEMO2K22", 120, "#000000", "#ffffff");

  return (
    <div className="relative mx-auto w-full max-w-md md:max-w-none" aria-label="A modified car with a BuildTag decal and a phone showing the scanned build">
      <div className="panel relative overflow-hidden p-4 sm:p-6">
        {/* Car */}
        <svg viewBox="0 0 640 300" className="w-full" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="road" x1="0" x2="1">
              <stop offset="0" stopColor="#0a0a0b" />
              <stop offset="0.5" stopColor="#1d1d21" />
              <stop offset="1" stopColor="#0a0a0b" />
            </linearGradient>
          </defs>
          <rect x="0" y="238" width="640" height="4" fill="url(#road)" />
          {/* body */}
          <path
            d="M70 215 L95 160 Q120 120 175 110 L260 96 Q300 88 340 96 L420 112 Q470 122 520 160 L560 180 Q590 190 590 212 L590 226 Q590 236 578 236 L82 236 Q70 236 70 224 Z"
            fill="#1a1a1e"
            stroke="#3a3a41"
            strokeWidth="2"
          />
          {/* glass */}
          <path d="M190 118 L262 104 Q300 97 336 104 L404 117 L378 152 L212 152 Z" fill="#0d0d10" stroke="#3a3a41" strokeWidth="2" />
          <path d="M296 104 L296 152" stroke="#3a3a41" strokeWidth="2" />
          {/* accent line */}
          <path d="M100 196 L560 196" stroke="#e4162b" strokeWidth="3" opacity="0.9" />
          {/* wheels */}
          {[160, 470].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="228" r="36" fill="#0a0a0b" stroke="#3a3a41" strokeWidth="4" />
              <circle cx={cx} cy="228" r="20" fill="#141416" stroke="#8b8b93" strokeWidth="2" />
              {[0, 72, 144, 216, 288].map((a) => (
                <line
                  key={a}
                  x1={cx}
                  y1="228"
                  x2={cx + Math.cos((a * Math.PI) / 180) * 18}
                  y2={228 + Math.sin((a * Math.PI) / 180) * 18}
                  stroke="#8b8b93"
                  strokeWidth="3"
                />
              ))}
            </g>
          ))}
          {/* BuildTag decal on the rear quarter */}
          <g transform="translate(486 130)">
            <rect x="0" y="0" width="58" height="72" rx="4" fill="#ffffff" />
            <rect x="8" y="8" width="42" height="42" fill="#ffffff" />
            <g transform="translate(8 8) scale(0.35)" dangerouslySetInnerHTML={{ __html: qr.replace(/<svg[^>]*>|<\/svg>/g, "") }} />
            <text x="29" y="63" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="6.5" fill="#0a0a0b">
              SCAN THE BUILD
            </text>
          </g>
          {/* scan beam */}
          <path d="M515 130 L600 40" stroke="#e4162b" strokeWidth="2" strokeDasharray="6 5" opacity="0.8" />
        </svg>

        {/* Phone */}
        <div className="absolute top-4 right-4 w-[120px] rounded-[18px] border border-line bg-[#0a0a0b] p-1.5 shadow-2xl sm:top-6 sm:right-6 sm:w-[150px]">
          <div className="overflow-hidden rounded-[13px] bg-[#111113]">
            <div className="h-14 bg-[radial-gradient(circle_at_30%_30%,#3a3a41,#131316)] sm:h-20" />
            <div className="space-y-1 p-2">
              <p className="font-display text-[8px] font-semibold tracking-[0.18em] text-signal uppercase">2022 Toyota</p>
              <p className="font-display text-[13px] leading-none font-bold uppercase sm:text-[15px]">GR Supra</p>
              <div className="grid grid-cols-3 gap-1 pt-1">
                {[
                  ["612", "WHP"],
                  ["574", "WTQ"],
                  ["37", "MODS"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded bg-[#0a0a0b] px-1 py-1 text-center">
                    <p className="font-display text-[11px] leading-none font-bold">{v}</p>
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
      <p className="mt-3 text-center text-xs text-muted-foreground">Decal on the car. Build sheet on the phone.</p>
    </div>
  );
}

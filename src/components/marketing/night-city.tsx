/**
 * Full-bleed night-city backdrop: neon glows, skyline silhouette, wet road
 * with animated lane markers, light streaks and scanlines. Pure SVG + CSS,
 * decorative only.
 */
export function NightCity() {
  const buildings = [
    [0, 210, 70],
    [80, 150, 60],
    [150, 240, 90],
    [250, 120, 50],
    [310, 280, 80],
    [400, 190, 70],
    [480, 320, 110],
    [600, 160, 60],
    [670, 250, 90],
    [770, 140, 55],
    [835, 300, 100],
    [945, 200, 75],
    [1030, 260, 85],
    [1125, 170, 60],
    [1195, 230, 95],
    [1300, 140, 60],
    [1370, 290, 110],
    [1490, 180, 70],
    [1570, 240, 90],
    [1670, 130, 60],
    [1740, 210, 80],
    [1830, 170, 90],
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* ambient neon */}
      <div className="absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(31,216,255,0.22),transparent_62%)]" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(255,45,122,0.28),transparent_62%)]" />
      <div className="absolute top-1/3 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(139,92,246,0.18),transparent_65%)]" />

      {/* skyline */}
      <svg viewBox="0 0 1920 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-[22%] h-[46%] w-full opacity-90">
        <defs>
          <linearGradient id="bld" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#141127" />
            <stop offset="1" stopColor="#06050d" />
          </linearGradient>
          <pattern id="win" width="14" height="18" patternUnits="userSpaceOnUse">
            <rect x="3" y="4" width="5" height="7" fill="#ffb020" opacity="0.35" />
          </pattern>
          <pattern id="win2" width="16" height="20" patternUnits="userSpaceOnUse">
            <rect x="4" y="5" width="5" height="7" fill="#1fd8ff" opacity="0.3" />
          </pattern>
        </defs>
        {buildings.map(([x, h, w], i) => (
          <g key={x}>
            <rect x={x} y={420 - h} width={w} height={h} fill="url(#bld)" />
            <rect x={x + 6} y={420 - h + 10} width={w - 12} height={h - 10} fill={i % 3 === 0 ? "url(#win2)" : "url(#win)"} />
            {i % 4 === 1 && <rect x={x + w / 2 - 2} y={420 - h - 40} width={4} height={40} fill="#262040" />}
            {i % 5 === 2 && <rect x={x} y={420 - h - 3} width={w} height={3} fill="#ff2d7a" opacity="0.8" />}
            {i % 7 === 3 && <rect x={x} y={420 - h - 3} width={w} height={3} fill="#1fd8ff" opacity="0.8" />}
          </g>
        ))}
        {/* horizon glow line */}
        <rect x="0" y="418" width="1920" height="2" fill="#ff2d7a" opacity="0.6" />
      </svg>

      {/* wet road */}
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-[linear-gradient(to_bottom,#0b0916,#06050d)]">
        <div className="absolute inset-0 opacity-60 [background:radial-gradient(ellipse_at_top,rgba(255,45,122,0.28),transparent_55%)]" />
        <svg viewBox="0 0 1920 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="lane" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffb020" stopOpacity="0" />
              <stop offset="1" stopColor="#ffb020" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* perspective edges */}
          <path d="M760 0 L0 300" stroke="#1fd8ff" strokeOpacity="0.35" strokeWidth="2" />
          <path d="M1160 0 L1920 300" stroke="#ff2d7a" strokeOpacity="0.35" strokeWidth="2" />
          {/* center lane markers */}
          <g className="animate-road">
            {[0, 60, 120, 180, 240, 300].map((y) => (
              <rect key={y} x="955" y={y - 40} width="10" height="26" fill="url(#lane)" />
            ))}
          </g>
        </svg>
        <div className="streaks absolute inset-0" />
      </div>

      <div className="scanlines absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,5,13,0.2),rgba(6,5,13,0.05)_40%,rgba(6,5,13,0.75)_100%)]" />
    </div>
  );
}

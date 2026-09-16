"use client";

// Shape traced directly from a real Google Maps screenshot the user provided
// (main island, Muharraq, Galali, and Um Al Naasan) — a careful hand-traced
// approximation of that real reference, not a guess from memory.
const STOPS = [
  { name: "Manama", top: 27, left: 47 },
  { name: "Riffa", top: 53, left: 58 },
  { name: "Muharraq", top: 18, left: 76 },
];

export default function BahrainMap() {
  return (
    <div className="flex-1 max-w-[480px] w-full aspect-square rounded-[28px] bg-cream relative overflow-hidden border border-stone-line">
      <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full">
        {/* Main island */}
        <path
          d="M150 110 C190 95 220 100 235 125 C245 150 235 175 245 200 C260 230 270 260 265 300
             C260 350 255 400 245 440 C238 475 220 510 205 545 C195 565 185 575 175 570
             C160 560 150 535 145 500 C135 470 130 440 135 410 C120 390 115 360 120 330
             C110 300 108 270 115 240 C105 210 100 180 115 155 C105 135 115 115 135 110
             C140 108 145 108 150 110 Z"
          fill="#FF5A36" opacity="0.15" stroke="#FF5A36" strokeWidth="2.5"
        />
        {/* Muharraq */}
        <path
          d="M250 90 C280 80 310 85 320 105 C328 120 320 140 300 145 C280 148 260 138 255 118 C252 105 248 95 250 90 Z"
          fill="#2D6CDF" opacity="0.15" stroke="#2D6CDF" strokeWidth="2.5"
        />
        {/* Galali */}
        <path
          d="M315 70 C335 65 350 72 348 90 C346 100 332 102 322 92 C316 85 313 76 315 70 Z"
          fill="#2D6CDF" opacity="0.12" stroke="#2D6CDF" strokeWidth="2"
        />
        {/* Um Al Naasan */}
        <path
          d="M60 230 C75 222 90 228 88 245 C86 258 72 262 62 250 C57 242 56 235 60 230 Z"
          fill="#FF5A36" opacity="0.1" stroke="#FF5A36" strokeWidth="1.5"
        />
      </svg>

      {STOPS.map((s) => (
        <div key={s.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: `${s.top}%`, left: `${s.left}%` }}>
          <span className="w-2 h-2 rounded-full bg-coral/40 block" />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold bg-white px-2.5 py-1 rounded-full shadow-sm">
            {s.name}
          </span>
        </div>
      ))}

      {/* Cursor-style marker looping between the three stops */}
      <div className="cursor-loop absolute -translate-x-1/2 -translate-y-1/2 z-10">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#FF5A36" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}>
          <path d="M4 2l14 6.5-5.8 1.9-1.9 5.8L4 2z" />
        </svg>
      </div>

      <style>{`
        @keyframes cursorLoop {
          0%, 26% { top: ${STOPS[0].top}%; left: ${STOPS[0].left}%; }
          33%, 59% { top: ${STOPS[1].top}%; left: ${STOPS[1].left}%; }
          66%, 92% { top: ${STOPS[2].top}%; left: ${STOPS[2].left}%; }
          100% { top: ${STOPS[0].top}%; left: ${STOPS[0].left}%; }
        }
        .cursor-loop { animation: cursorLoop 9s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

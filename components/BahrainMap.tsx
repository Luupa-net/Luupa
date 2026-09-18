"use client";

import { Search } from "lucide-react";

// Shape traced from two consistent real Bahrain outline references (not a
// satellite photo guess this time) — the distinctive jagged northern coastline
// and Muharraq's irregular shape are the key features that make this
// recognizable, so those are what this deliberately preserves.
const STOPS = [
  { name: "Manama", top: 28, left: 47 },
  { name: "Riffa", top: 58, left: 48 },
  { name: "Muharraq", top: 12, left: 78 },
];

export default function BahrainMap() {
  return (
    <div className="flex-1 max-w-[480px] w-full aspect-square rounded-[28px] bg-cream relative overflow-hidden">
      <svg viewBox="0 0 300 500" className="absolute inset-0 w-full h-full">
        {/* Main island — jagged north, smooth taper to a point in the south */}
        <path
          d="M135 85 L130 55 L145 40 L140 20 L160 15 L155 35 L175 25 L185 45 L175 60
             L195 55 L205 40 L215 50 L205 70 L220 75 L210 90 L195 85 L185 100
             C180 150 175 200 170 250 C165 300 155 350 145 390 C135 420 125 445 110 465
             C95 440 85 405 82 365 C79 325 85 295 80 260 C75 225 85 195 82 165
             C79 135 90 115 100 100 C108 90 120 88 135 85 Z"
          fill="#A32CC4" opacity="0.15" stroke="#A32CC4" strokeWidth="2.5" strokeLinejoin="round"
        />
        {/* Muharraq — irregular, close to the main island's jagged edge */}
        <path
          d="M215 55 L210 35 L225 20 L245 15 L260 25 L255 45 L270 50 L265 70 L245 75 L230 65 Z"
          fill="#2D6CDF" opacity="0.15" stroke="#2D6CDF" strokeWidth="2.5" strokeLinejoin="round"
        />
        {/* Um Al Naasan */}
        <path
          d="M40 175 C42 165 55 160 62 168 C68 176 65 190 55 193 C45 195 38 185 40 175 Z"
          fill="#A32CC4" opacity="0.1" stroke="#A32CC4" strokeWidth="1.5"
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

      {/* Magnifying glass, looping between stops — "searching" the map */}
      <div className="search-loop absolute -translate-x-1/2 -translate-y-1/2 z-10 bg-coral rounded-full p-1.5" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.2))" }}>
        <Search size={16} color="white" strokeWidth={2.5} />
      </div>

      <style>{`
        @keyframes searchLoop {
          0%, 26% { top: ${STOPS[0].top}%; left: ${STOPS[0].left}%; }
          33%, 59% { top: ${STOPS[1].top}%; left: ${STOPS[1].left}%; }
          66%, 92% { top: ${STOPS[2].top}%; left: ${STOPS[2].left}%; }
          100% { top: ${STOPS[0].top}%; left: ${STOPS[0].left}%; }
        }
        .search-loop { animation: searchLoop 9s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

"use client";

import { MapPin } from "lucide-react";

// The outline shape is still pending a real, accurate source — see chat
// history. This component builds the part that's safe to build without one:
// a real animated marker looping between labeled areas, no shape involved.
const STOPS = [
  { name: "Manama", top: "28%", left: "48%" },
  { name: "Riffa", top: "68%", left: "42%" },
  { name: "Muharraq", top: "24%", left: "68%" },
];

export default function BahrainMapPlaceholder() {
  return (
    <div className="flex-1 max-w-[480px] w-full aspect-square rounded-[28px] border-2 border-dashed border-stone-dim/50 bg-cream relative overflow-hidden">
      <div className="absolute top-5 left-5 right-5 flex items-start gap-2 text-stone-dim">
        <MapPin size={18} strokeWidth={1.5} className="shrink-0 mt-0.5" />
        <p className="text-xs font-semibold leading-snug">Real Bahrain outline still pending — animation is live</p>
      </div>

      {STOPS.map((s) => (
        <div key={s.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: s.top, left: s.left }}>
          <span className="w-2 h-2 rounded-full bg-coral/40 block" />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold bg-white px-2.5 py-1 rounded-full shadow-sm">
            {s.name}
          </span>
        </div>
      ))}

      <div className="marker-loop absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 rounded-full bg-coral" />
        <span className="absolute inset-0 rounded-full bg-coral animate-ping" />
      </div>

      <style>{`
        @keyframes loop3 {
          0%, 28% { top: ${STOPS[0].top}; left: ${STOPS[0].left}; }
          33%, 61% { top: ${STOPS[1].top}; left: ${STOPS[1].left}; }
          66%, 94% { top: ${STOPS[2].top}; left: ${STOPS[2].left}; }
          100% { top: ${STOPS[0].top}; left: ${STOPS[0].left}; }
        }
        .marker-loop { animation: loop3 9s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

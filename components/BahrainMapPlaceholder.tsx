import { MapPin } from "lucide-react";

// TEMPORARY: swap this whole component's contents for the real, accurate
// Bahrain outline once we have one (either a file Hedi provides, or one
// properly sourced later) — do not hand-draw a shape here, see chat history
// for why that was explicitly rejected as inaccurate.
export default function BahrainMapPlaceholder() {
  return (
    <div className="flex-1 max-w-[480px] w-full aspect-square rounded-[28px] border-2 border-dashed border-stone-dim/50 bg-cream flex flex-col items-center justify-center gap-3 text-stone-dim text-center px-8">
      <MapPin size={28} strokeWidth={1.5} />
      <p className="text-sm font-semibold max-w-[260px]">
        Real Bahrain map goes here — animated marker looping Manama → Riffa → Muharraq
      </p>
    </div>
  );
}

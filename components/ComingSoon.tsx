import { Sparkles } from "lucide-react";

const UPCOMING = ["Beauty & Grooming", "Home Renovation", "Wedding & Events", "Personal Fitness"];

export default function ComingSoon() {
  return (
    <div className="bg-ink rounded-[22px] p-8 flex flex-col h-full text-white">
      <div className="flex items-center gap-2 mb-4 text-skyblue">
        <Sparkles size={16} />
        <span className="text-xs uppercase tracking-wide font-bodyAlt font-bold">More on the way</span>
      </div>
      <p className="font-displayAlt font-bold text-2xl leading-snug flex-1">
        Car care is just the start.
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        {UPCOMING.map((c) => (
          <span
            key={c}
            className="text-xs px-3.5 py-2 rounded-full bg-white/10 font-bodyAlt font-semibold"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

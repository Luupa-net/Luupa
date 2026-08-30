import { Sparkles } from "lucide-react";

const UPCOMING = ["Beauty & Grooming", "Home Renovation", "Wedding & Events", "Personal Fitness"];

export default function ComingSoon() {
  return (
    <div className="bg-canvas2 rounded-xl p-6 flex flex-col h-full hover:shadow-md hover:shadow-black/[0.04] transition-shadow">
      <div className="flex items-center gap-2 text-terra-dim mb-4">
        <Sparkles size={16} />
        <span className="text-xs uppercase tracking-wide font-medium">More on the way</span>
      </div>
      <p className="text-ink font-medium text-lg leading-snug flex-1">
        Car care is just the start.
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        {UPCOMING.map((c) => (
          <span
            key={c}
            className="text-xs px-3 py-1.5 rounded-full bg-white text-navy font-medium"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

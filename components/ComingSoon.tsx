"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const UPCOMING = ["Beauty & Grooming", "Home Renovation", "Wedding & Events", "Personal Fitness"];

export default function ComingSoon() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % UPCOMING.length), 1800);
    return () => clearInterval(id);
  }, []);

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
        {UPCOMING.map((c, i) => (
          <span
            key={c}
            className={`text-xs px-3.5 py-2 rounded-full font-bodyAlt font-semibold transition-all duration-500 ${
              i === active ? "bg-teal text-white scale-105" : "bg-white/10 text-white"
            }`}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

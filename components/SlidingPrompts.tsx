"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";

const PROMPTS = [
  "Need your car showroom-ready before you sell it?",
  "Windows too hot to touch by noon?",
  "Paint looking dull after the summer?",
  "Want that new-car smell back?",
  "Scratches you're tired of seeing?",
];

export default function SlidingPrompts() {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PROMPTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-teal rounded-[22px] p-8 flex flex-col h-full text-white">
      <div className="flex items-center gap-2 mb-4 opacity-80">
        <Sparkles size={16} />
        <span className="text-xs uppercase tracking-wide font-bodyAlt font-bold">Not sure what you need?</span>
      </div>

      <button
        onClick={() => router.push(`/browse?q=${encodeURIComponent(PROMPTS[index])}`)}
        className="group text-left flex-1 flex items-center"
      >
        <div className="relative w-full h-20">
          {PROMPTS.map((p, i) => (
            <span
              key={p}
              className="absolute inset-0 flex items-center font-displayAlt font-bold text-2xl leading-snug transition-all duration-500"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "translateY(0)" : "translateY(10px)",
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </button>

      <span className="inline-flex items-center gap-1.5 text-sm font-bodyAlt font-bold bg-white text-teal px-4 py-2 rounded-full mt-4 self-start">
        See who can help <ArrowRight size={14} />
      </span>
    </div>
  );
}

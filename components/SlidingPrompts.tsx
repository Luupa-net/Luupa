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
    <div className="bg-canvas2 rounded-xl p-6 flex flex-col h-full hover:shadow-md hover:shadow-black/[0.04] transition-shadow">
      <div className="flex items-center gap-2 text-navy mb-4">
        <Sparkles size={16} />
        <span className="text-xs uppercase tracking-wide font-medium">Not sure what you need?</span>
      </div>

      <button
        onClick={() => router.push(`/browse?q=${encodeURIComponent(PROMPTS[index])}`)}
        className="group text-left flex-1 flex items-center"
      >
        <div className="relative w-full h-16">
          {PROMPTS.map((p, i) => (
            <span
              key={p}
              className="absolute inset-0 flex items-center text-ink font-medium text-lg leading-snug transition-all duration-500"
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

      <span className="flex items-center gap-1 text-sm text-navy font-medium mt-3">
        See who can help <ArrowRight size={14} />
      </span>
    </div>
  );
}

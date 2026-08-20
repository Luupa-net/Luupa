"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PROMPTS.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      onClick={() => router.push(`/browse?q=${encodeURIComponent(PROMPTS[index])}`)}
      className="group w-full text-left"
    >
      <div className="flex items-center gap-3 h-14 overflow-hidden">
        <span className="shrink-0 text-xs uppercase tracking-wide text-stone">Try</span>
        <div className="relative flex-1 h-full">
          {PROMPTS.map((p, i) => (
            <span
              key={p}
              className="absolute inset-0 flex items-center text-ink font-medium text-[15px] sm:text-base transition-all duration-500"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "translateY(0)" : "translateY(8px)",
              }}
            >
              {p}
              <span className="ml-2 text-terra opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

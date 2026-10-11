"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";

// Each prompt leads to the category that actually solves it. (They used to
// run a free-text search for the whole sentence — "Windows too hot to touch
// by noon?" — which matched no business, so the card always led to an empty
// results page.)
const PROMPTS = [
  { text: "Need your car showroom-ready before you sell it?", sub: "Detailing" },
  { text: "Windows too hot to touch by noon?", sub: "Window Tinting" },
  { text: "Paint looking dull after the summer?", sub: "Paint Correction" },
  { text: "Want that new-car shine to last?", sub: "Ceramic Coating & PPF" },
  { text: "No time to drive to a car wash?", sub: "Mobile Detailing" },
];

export default function SlidingPrompts() {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PROMPTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const go = () => router.push(`/browse?sub=${encodeURIComponent(PROMPTS[index].sub)}`);

  return (
    <div className="bg-teal rounded-[22px] p-8 flex flex-col h-full text-white">
      <div className="flex items-center gap-2 mb-4 opacity-80">
        <Sparkles size={16} />
        <span className="text-xs uppercase tracking-wide font-bodyAlt font-bold">Not sure what you need?</span>
      </div>

      <button onClick={go} className="group text-left flex-1 flex items-center">
        <div className="relative w-full h-20">
          {PROMPTS.map((p, i) => (
            <span
              key={p.text}
              aria-hidden={i !== index}
              className="absolute inset-0 flex items-center font-displayAlt font-bold text-2xl leading-snug transition-all duration-500"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "translateY(0)" : "translateY(10px)",
              }}
            >
              {p.text}
            </span>
          ))}
        </div>
      </button>

      <button
        onClick={go}
        className="inline-flex items-center gap-1.5 text-sm font-bodyAlt font-bold bg-white text-teal px-4 py-2 rounded-full mt-4 self-start hover:gap-2.5 transition-all"
      >
        See {PROMPTS[index].sub.toLowerCase()} pros <ArrowRight size={14} />
      </button>
    </div>
  );
}

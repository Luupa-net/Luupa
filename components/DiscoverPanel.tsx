"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, ChevronRight } from "lucide-react";

const PROMPTS = [
  "Need your car showroom-ready before you sell it?",
  "Windows too hot to touch by noon?",
  "Paint looking dull after the summer?",
  "Want that new-car smell back?",
  "Scratches you're tired of seeing?",
];

const UPCOMING = [
  { name: "Beauty & Grooming", note: "Barbers, salons, spas" },
  { name: "Home Renovation", note: "Contractors, AC, painters" },
  { name: "Wedding & Events", note: "Vendors, venues, catering" },
  { name: "Personal Fitness", note: "Trainers, padel, gyms" },
];

export default function DiscoverPanel() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PROMPTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  function scrollNext() {
    scrollRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  }

  return (
    <div className="bg-canvas2 rounded-xl p-6 sm:p-7">
      {/* Top: rotating prompt, tappable */}
      <button
        onClick={() => router.push(`/browse?q=${encodeURIComponent(PROMPTS[index])}`)}
        className="group w-full text-left"
      >
        <div className="flex items-center gap-2 text-terra-dim mb-3">
          <Sparkles size={15} />
          <span className="text-xs uppercase tracking-wide font-medium">Not sure what you need?</span>
        </div>
        <div className="relative h-8 sm:h-9">
          {PROMPTS.map((p, i) => (
            <span
              key={p}
              className="absolute inset-0 flex items-center text-ink font-medium text-base sm:text-lg leading-snug transition-all duration-500"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? "translateY(0)" : "translateY(8px)",
              }}
            >
              {p}
              <ArrowRight size={16} className="ml-2 text-terra opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </span>
          ))}
        </div>
      </button>

      <div className="h-px bg-navy/10 my-6" />

      {/* Bottom: scrollable category cards — same panel, no color break */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide font-medium text-navy/70">More on the way</span>
        <button
          onClick={scrollNext}
          aria-label="See more categories"
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white text-navy hover:bg-navy hover:text-white transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth -mx-1 px-1">
        {UPCOMING.map((c) => (
          <div
            key={c.name}
            className="shrink-0 w-40 rounded-lg bg-white border border-navy/10 px-4 py-3"
          >
            <p className="text-sm font-medium text-ink">{c.name}</p>
            <p className="text-xs text-stone mt-0.5">{c.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

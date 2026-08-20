"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const SUBCATEGORIES = [
  "Detailing", "Window Tinting", "Ceramic Coating", "PPF",
  "Car Wash", "Wraps & Vinyl", "Paint Correction", "Mobile Detailing",
];

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  // Duplicate the list so the marquee loops seamlessly at -50%
  const track = [...SUBCATEGORIES, ...SUBCATEGORIES];

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ceramic coating in Riffa..."
          className="w-full h-13 rounded-lg bg-white border border-stone-line text-ink placeholder:text-stone-dim pl-11 pr-4 py-3.5 text-[15px] focus:border-navy transition-colors"
        />
      </form>
      <button
        onClick={handleSubmit as any}
        className="mt-3 w-full sm:w-auto px-6 py-3 rounded-lg bg-terra text-white font-medium text-[15px] hover:bg-terra-dim active:scale-[0.98] transition-all"
      >
        Search
      </button>

      {/* Moving ticker — genuinely animated, not a static row */}
      <div className="mt-8 -mx-5 sm:mx-0 overflow-hidden">
        <div className="flex gap-3 marquee-track w-max">
          {track.map((label, i) => (
            <span
              key={i}
              className="shrink-0 text-sm px-4 py-2 rounded-full border border-stone-line text-ink/60 bg-white whitespace-nowrap"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

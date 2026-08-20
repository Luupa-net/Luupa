"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const SUBCATEGORIES = [
  { slug: "detailing", label: "Detailing", keywords: ["detail", "interior", "exterior", "clean", "wash"] },
  { slug: "tinting", label: "Window Tinting", keywords: ["tint", "window", "film", "heat", "uv"] },
  { slug: "ceramic-ppf", label: "Ceramic & PPF", keywords: ["ceramic", "ppf", "coating", "protection", "paint"] },
  { slug: "car-wash", label: "Car Wash", keywords: ["wash", "express", "quick", "clean"] },
  { slug: "wraps", label: "Wraps & Vinyl", keywords: ["wrap", "vinyl", "color change", "customization"] },
  { slug: "paint-correction", label: "Paint Correction", keywords: ["paint", "correction", "polish", "restore", "scratch"] },
  { slug: "engine-detailing", label: "Engine Detailing", keywords: ["engine", "undercarriage", "bay"] },
  { slug: "mobile", label: "Mobile Detailing", keywords: ["mobile", "on-demand", "home", "come to me"] },
];

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const matches = useMemo(() => {
    if (!query.trim()) return new Set<string>();
    const q = query.toLowerCase();
    const hits = new Set<string>();
    SUBCATEGORIES.forEach((c) => {
      if (c.label.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q) || q.includes(k))) {
        hits.add(c.slug);
      }
    });
    return hits;
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ceramic coating in Riffa..."
          className="w-full h-14 rounded-full bg-white border-2 border-stone-line text-ink placeholder:text-stone-dim pl-11 pr-28 text-base shadow-sm focus:border-coral transition-colors"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 h-11 px-5 rounded-full bg-coral text-white font-semibold text-sm hover:bg-coral-dim active:scale-95 transition-all"
        >
          Search
        </button>
      </form>

      {/* Horizontal scroll chips — thumb-friendly, scales infinitely as categories grow */}
      <div className="mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {SUBCATEGORIES.map((c) => {
          const active = matches.has(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => setQuery(c.label)}
              className={`shrink-0 text-sm px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap ${
                active
                  ? "bg-coral/10 border-coral text-coral-dim font-semibold"
                  : "bg-white border-stone-line text-ink/70"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

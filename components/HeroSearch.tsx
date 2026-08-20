"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

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
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try 'ceramic coating Riffa' or 'window tint'"
          className="w-full h-14 rounded-lg bg-graphite-light border border-white/10 text-canvas placeholder:text-titanium-dim px-5 pr-32 text-base focus:border-ignition transition-colors"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 h-10 px-5 rounded-md bg-ignition text-graphite font-semibold text-sm hover:bg-ignition-light transition-colors"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUBCATEGORIES.map((c) => {
          const active = matches.has(c.slug);
          return (
            <span
              key={c.slug}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 ${
                active
                  ? "bg-ignition/15 border-ignition text-ignition-light scale-105"
                  : "border-white/10 text-titanium-dim"
              }`}
            >
              {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

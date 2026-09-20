"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HeroSearch({
  compact = false,
  defaultValue = "",
  placeholder = "Ceramic coating in Riffa…",
}: {
  compact?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="relative w-full max-w-md mx-auto">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full h-[52px] rounded-full bg-white border border-stone-line text-ink placeholder:text-stone pl-11 pr-28 font-bodyAlt text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal/40 transition-shadow"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-10 px-5 rounded-full bg-navy text-white font-bodyAlt font-semibold text-sm hover:bg-navy-light active:scale-[0.97] transition-all"
        >
          Search
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full h-16 rounded-2xl bg-white border-2 border-ink text-ink placeholder:text-stone pl-12 pr-4 font-bodyAlt text-[16px] focus:outline-none focus:ring-2 focus:ring-teal transition-shadow"
        />
      </div>
      <button
        type="submit"
        className="h-16 px-9 rounded-2xl bg-teal text-white font-bodyAlt font-bold text-[16px] hover:bg-teal-dim active:scale-[0.98] transition-all shrink-0"
      >
        Search
      </button>
    </form>
  );
}

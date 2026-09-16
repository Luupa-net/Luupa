"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ceramic coating in Riffa…"
          className="w-full h-16 rounded-2xl bg-white border-2 border-ink text-ink placeholder:text-stone pl-12 pr-4 font-bodyAlt text-[16px] focus:outline-none focus:ring-2 focus:ring-coral transition-shadow"
        />
      </div>
      <button
        type="submit"
        className="h-16 px-9 rounded-2xl bg-coral text-white font-bodyAlt font-bold text-[16px] hover:bg-coral-dim active:scale-[0.98] transition-all shrink-0"
      >
        Search
      </button>
    </form>
  );
}

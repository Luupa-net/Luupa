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
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full max-w-lg mx-auto">
      <div className="relative flex-1">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ceramic coating in Riffa..."
          className="w-full h-13 rounded-lg bg-white/95 backdrop-blur border-0 text-ink placeholder:text-stone-dim pl-11 pr-4 py-3.5 text-[15px] shadow-lg shadow-black/10 focus:ring-2 focus:ring-terra transition-shadow"
        />
      </div>
      <button
        type="submit"
        className="px-6 py-3.5 rounded-lg bg-terra text-white font-medium text-[15px] hover:bg-terra-dim active:scale-[0.98] transition-all shadow-lg shadow-black/10 shrink-0"
      >
        Search
      </button>
    </form>
  );
}

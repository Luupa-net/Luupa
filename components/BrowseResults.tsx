"use client";

import { createContext, useContext, useMemo, useState } from "react";
import ListingCard, { Listing } from "@/components/ListingCard";
import { Sparkles, Star } from "lucide-react";

type Sort = "recommended" | "rating";

const OPTIONS: { key: Sort; label: string; icon: typeof Star }[] = [
  { key: "recommended", label: "Recommended", icon: Sparkles },
  { key: "rating", label: "Highest rated", icon: Star },
];

// The sort toggle used to be two plain <Link>s: every click was a full
// server round trip (re-render the route, re-query Supabase, flash the
// loading skeleton), which is why it felt sluggish. The page already has
// every field either order needs, so sorting now happens in memory —
// instant — and the URL is kept in sync with history.replaceState, so a
// refresh or shared link still opens on the same sort without a navigation.
// The toggle and the grid live in different spots of the server-rendered
// layout, so they share the choice through this small context.
const SortContext = createContext<{ sort: Sort; setSort: (s: Sort) => void } | null>(null);

export function BrowseSortProvider({ initialSort, children }: { initialSort: Sort; children: React.ReactNode }) {
  const [sort, setSortState] = useState<Sort>(initialSort);

  function setSort(next: Sort) {
    if (next === sort) return;
    setSortState(next);
    const url = new URL(window.location.href);
    if (next === "rating") url.searchParams.set("sort", "rating");
    else url.searchParams.delete("sort");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }

  return <SortContext.Provider value={{ sort, setSort }}>{children}</SortContext.Provider>;
}

function useSort() {
  const ctx = useContext(SortContext);
  if (!ctx) throw new Error("BrowseSortToggle/SortedListings must be inside BrowseSortProvider");
  return ctx;
}

export function BrowseSortToggle() {
  const { sort, setSort } = useSort();
  const activeIndex = OPTIONS.findIndex((o) => o.key === sort);

  return (
    <div role="tablist" aria-label="Sort results" className="relative grid grid-cols-2 bg-white border border-stone-line rounded-xl p-1 shadow-sm">
      {/* One sliding pill behind both labels — animates on the GPU
          (transform), so the switch feels immediate and smooth. */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-navy shadow-md transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={sort === key}
          onClick={() => setSort(key)}
          className={`relative z-10 flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors duration-200 active:scale-[0.97] ${
            sort === key ? "text-white" : "text-ink/60 hover:text-ink"
          }`}
        >
          <Icon size={12} className={sort === key && key === "rating" ? "fill-current" : ""} />
          {label}
        </button>
      ))}
    </div>
  );
}

// `listings` arrives already in "recommended" order (verified first, then
// tier) from the server query.
export function SortedListings({ listings }: { listings: Listing[] }) {
  const { sort } = useSort();

  const sorted = useMemo(() => {
    if (sort === "recommended") return listings;
    // Stable: ties keep their recommended order, so equally rated
    // businesses don't shuffle between clicks. Unrated sink to the bottom.
    return listings
      .map((l, i) => ({ l, i }))
      .sort((a, b) => {
        const ra = a.l.rating_avg ?? -1;
        const rb = b.l.rating_avg ?? -1;
        if (rb !== ra) return rb - ra;
        const ca = a.l.review_count ?? 0;
        const cb = b.l.review_count ?? 0;
        if (cb !== ca) return cb - ca;
        return a.i - b.i;
      })
      .map(({ l }) => l);
  }, [listings, sort]);

  return (
    <>
      {sorted.map((l, i) => (
        // Keyed by sort too, so the cards replay a quick staggered fade-in
        // on every switch — a visible "re-ranked" cue instead of a jump.
        <div key={`${sort}-${l.id}`} className="fade-up" style={{ animationDuration: "0.35s", animationDelay: `${Math.min(i, 8) * 30}ms` }}>
          <ListingCard listing={l} />
        </div>
      ))}
    </>
  );
}

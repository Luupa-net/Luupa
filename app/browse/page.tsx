import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/components/ListingCard";
import { BrowseSortProvider, BrowseSortToggle, SortedListings } from "@/components/BrowseResults";
import HeroSearch from "@/components/HeroSearch";
import { SUBCATEGORIES, AREAS } from "@/lib/taxonomy";
import { rankListings } from "@/lib/ranking";
import { BadgeCheck, Car, MapPin, X } from "lucide-react";

// SECURITY: the search query gets pasted into a raw PostgREST filter string
// below — without escaping, someone could put a comma or parenthesis in the
// search box to inject extra filter clauses. This strips those out first
// (plus PostgREST's own * wildcard and quote/backslash characters).
function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%*"\\]/g, "").slice(0, 100);
}

type Params = { q?: string; sub?: string; area?: string; verified?: string; mobile?: string; sort?: string };

// Filters combine: picking an area keeps the chosen service (and vice versa)
// instead of every link resetting the page to a single filter. Clicking the
// active value again removes just that filter.
function hrefWith(params: Params, changes: Partial<Params>): string {
  const next: Record<string, string> = {};
  (["q", "sub", "area", "verified", "mobile", "sort"] as const).forEach((k) => {
    const value = k in changes ? changes[k] : params[k];
    if (value) next[k] = value;
  });
  const qs = new URLSearchParams(next).toString();
  return qs ? `/browse?${qs}` : "/browse";
}

// searchParams usage already forces this route to render dynamically per
// request, but Next's fetch cache (which wraps supabase-js's underlying
// fetch calls too) still honors this as the default cache window for the
// Supabase reads below — repeat navigations to the same filter combo within
// 30s reuse the cached result instead of hitting the DB again. Same pattern
// as app/page.tsx's featured-listings query.
export const revalidate = 30;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const p = await searchParams;
  const what = p.sub || (p.q ? `"${p.q.slice(0, 40)}"` : "Car care");
  return {
    title: `${what}${p.area ? ` in ${p.area}` : " in Bahrain"} — Luupa`,
    description: `Compare ${p.sub ? p.sub.toLowerCase() : "car care"} businesses${p.area ? ` in ${p.area}` : " across Bahrain"} — real prices, real reviews, book online.`,
  };
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Params> }) {
  // Next.js 15+: searchParams is now a Promise and must be awaited
  const params = await searchParams;
  // SECURITY: query the businesses_public VIEW, not the businesses table —
  // the view already projects down to a public-safe column list and only
  // ever contains active rows (see supabase/schema.sql), so this is safe
  // against direct REST access with the anon key, not just against what
  // this page happens to ask for. No need to re-filter status here.
  let query = supabase
    .from("businesses_public")
    .select("id, name, subcategories, areas, description, verified, verified_until, tier, photos, is_mobile, rating_avg, review_count");

  // subcategories/areas are arrays now — .contains() checks the array includes this value
  if (params.sub) query = query.contains("subcategories", [params.sub]);
  if (params.area) query = query.contains("areas", [params.area]);
  const term = params.q ? sanitizeSearchTerm(params.q) : "";
  if (term) {
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (params.verified === "true") {
    // Only businesses whose verification hasn't expired — no expiry set, or expiry still in the future
    query = query.eq("verified", true).or(`verified_until.is.null,verified_until.gt.${new Date().toISOString()}`);
  }
  if (params.mobile === "true") {
    query = query.eq("is_mobile", true);
  }

  const { data, error } = await query.limit(500);
  // Ranked in code ("recommended"): see lib/ranking.ts for why ordering by
  // `tier` in SQL put featured businesses last. "Highest rated" is applied
  // client-side by SortedListings — instant to switch, no round trip.
  // `as unknown as` because the explicit column list (deliberately narrower
  // than select("*")) doesn't structurally match Listing.
  const listings = rankListings((data ?? []) as unknown as Listing[]);
  const hasFilters = !!(params.q || params.sub || params.area || params.verified || params.mobile);

  const chip = (active: boolean, tone: "navy" | "teal" = "navy") =>
    `shrink-0 flex items-center gap-1 text-sm px-4 py-2 rounded-full border-2 whitespace-nowrap transition-colors ${
      active
        ? tone === "teal"
          ? "bg-teal border-teal text-white font-semibold"
          : "bg-navy border-navy text-white font-semibold"
        : "bg-white border-stone-line text-ink/70 hover:border-navy/30"
    }`;
  const sideLink = (active: boolean) =>
    `flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 -mx-2.5 transition-colors ${
      active ? "bg-teal/10 text-teal-dim font-semibold" : "hover:text-teal-dim hover:bg-canvas2"
    }`;

  return (
    <BrowseSortProvider initialSort={params.sort === "rating" ? "rating" : "recommended"}>
    <div className="max-w-6xl mx-auto px-5 py-6 sm:py-10">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
        {params.q ? `Results for "${params.q}"` : params.sub ? params.sub : "Browse car care businesses"}
      </h1>
      <div className="flex items-center justify-between flex-wrap gap-2.5 mt-1">
        <p className="text-stone text-sm flex items-center gap-2 flex-wrap">
          {listings.length} {listings.length === 1 ? "business" : "businesses"} found
          {params.area && <span className="flex items-center gap-1"><MapPin size={12} /> {params.area}</span>}
          {hasFilters && (
            <Link href={params.sort ? `/browse?sort=${params.sort}` : "/browse"} className="flex items-center gap-1 text-xs font-semibold text-teal-dim hover:text-teal">
              <X size={12} /> Clear all
            </Link>
          )}
        </p>
        <BrowseSortToggle />
      </div>

      {/* Know exactly who you're looking for? Small, low-key search — not a
          replacement for the category browse below, just a shortcut past it. */}
      <div className="mt-5 max-w-sm">
        <HeroSearch compact defaultValue={params.q ?? ""} placeholder="Search by business name…" />
      </div>

      {/* Mobile: horizontal scrolling filter chips. Desktop: sidebar (below) */}
      <div className="md:hidden mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar">
        <Link href={hrefWith(params, { verified: params.verified === "true" ? undefined : "true" })} className={chip(params.verified === "true")}>
          <BadgeCheck size={14} /> Verified only
        </Link>
        <Link href={hrefWith(params, { mobile: params.mobile === "true" ? undefined : "true" })} className={chip(params.mobile === "true")}>
          <Car size={14} /> Comes to you
        </Link>
        {SUBCATEGORIES.map((s) => (
          <Link key={s} href={hrefWith(params, { sub: params.sub === s ? undefined : s })} className={chip(params.sub === s, "teal")}>
            {s}
          </Link>
        ))}
      </div>
      <div className="md:hidden mt-2 -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {AREAS.map((a) => (
          <Link key={a} href={hrefWith(params, { area: params.area === a ? undefined : a })} className={`${chip(params.area === a)} !text-xs !px-3 !py-1.5`}>
            <MapPin size={12} /> {a}
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-8 mt-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block space-y-6">
          <div>
            <Link
              href={hrefWith(params, { verified: params.verified === "true" ? undefined : "true" })}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg ${
                params.verified === "true" ? "bg-navy text-white" : "bg-canvas2 text-ink hover:bg-stone-line/60"
              }`}
            >
              <BadgeCheck size={14} /> Verified only
            </Link>
            <Link
              href={hrefWith(params, { mobile: params.mobile === "true" ? undefined : "true" })}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg mt-1.5 ${
                params.mobile === "true" ? "bg-navy text-white" : "bg-canvas2 text-ink hover:bg-stone-line/60"
              }`}
            >
              <Car size={14} /> Comes to you
            </Link>
          </div>
          <div>
            <h4 className="font-semibold text-ink text-sm mb-2">Service</h4>
            <ul className="space-y-0.5 text-sm text-stone">
              {SUBCATEGORIES.map((s) => (
                <li key={s}>
                  <Link href={hrefWith(params, { sub: params.sub === s ? undefined : s })} className={sideLink(params.sub === s)}>
                    {s} {params.sub === s && <X size={12} />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-ink text-sm mb-2">Area</h4>
            <ul className="space-y-0.5 text-sm text-stone">
              {AREAS.map((a) => (
                <li key={a}>
                  <Link href={hrefWith(params, { area: params.area === a ? undefined : a })} className={sideLink(params.area === a)}>
                    {a} {params.area === a && <X size={12} />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Results — single column on mobile, two on larger screens */}
        <div className="grid sm:grid-cols-2 gap-4 content-start">
          {error && (
            <p className="text-sm text-red-600 col-span-2">
              Couldn't load listings right now — please try again in a moment.
            </p>
          )}
          {!error && listings.length === 0 && (
            <div className="col-span-2 text-center py-16 border-2 border-dashed border-stone-line rounded-xl bg-white">
              <p className="text-stone">{hasFilters ? "No businesses match these filters yet." : "No businesses listed yet. Be the first to get listed."}</p>
              {hasFilters ? (
                <Link href="/browse" className="text-teal-dim font-semibold mt-2 inline-block">
                  See all businesses →
                </Link>
              ) : (
                <Link href="/business/signup" className="text-teal-dim font-semibold mt-2 inline-block">
                  List your business →
                </Link>
              )}
            </div>
          )}
          <SortedListings listings={listings} />
        </div>
      </div>
    </div>
    </BrowseSortProvider>
  );
}

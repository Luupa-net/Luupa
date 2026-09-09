import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ListingCard, { Listing } from "@/components/ListingCard";
import { SUBCATEGORIES, AREAS } from "@/lib/taxonomy";
import { BadgeCheck } from "lucide-react";

// SECURITY: the search query gets pasted into a raw PostgREST filter string
// below — without escaping, someone could put a comma or parenthesis in the
// search box to inject extra filter clauses. This strips those out first.
function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%]/g, "").slice(0, 100);
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sub?: string; area?: string; verified?: string }>;
}) {
  // Next.js 15+: searchParams is now a Promise and must be awaited
  const params = await searchParams;
  let query = supabase.from("businesses").select("*").eq("status", "active");

  // subcategories/areas are arrays now — .contains() checks the array includes this value
  if (params.sub) query = query.contains("subcategories", [params.sub]);
  if (params.area) query = query.contains("areas", [params.area]);
  if (params.q) {
    const term = sanitizeSearchTerm(params.q);
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (params.verified === "true") {
    // Only businesses whose verification hasn't expired — no expiry set, or expiry still in the future
    query = query.eq("verified", true).or(`verified_until.is.null,verified_until.gt.${new Date().toISOString()}`);
  }

  // Verified businesses surface first by default, then higher tiers
  const { data, error } = await query
    .order("verified", { ascending: false })
    .order("tier", { ascending: false });
  const listings = (data ?? []) as Listing[];

  return (
    <div className="max-w-6xl mx-auto px-5 py-6 sm:py-10">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
        {params.q ? `Results for "${params.q}"` : "Browse car care businesses"}
      </h1>
      <p className="text-stone mt-1 text-sm">
        {listings.length} {listings.length === 1 ? "business" : "businesses"} found
      </p>

      {/* Mobile: horizontal scrolling filter chips. Desktop: sidebar (below) */}
      <div className="md:hidden mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar">
        <Link
          href={params.verified === "true" ? "/browse" : "/browse?verified=true"}
          className={`shrink-0 flex items-center gap-1 text-sm px-4 py-2 rounded-full border-2 whitespace-nowrap ${
            params.verified === "true"
              ? "bg-navy border-navy text-white font-semibold"
              : "bg-white border-stone-line text-ink/70"
          }`}
        >
          <BadgeCheck size={14} /> Verified only
        </Link>
        {SUBCATEGORIES.map((s) => (
          <Link
            key={s}
            href={`/browse?sub=${encodeURIComponent(s)}`}
            className={`shrink-0 text-sm px-4 py-2 rounded-full border-2 whitespace-nowrap ${
              params.sub === s
                ? "bg-terra border-terra text-white font-semibold"
                : "bg-white border-stone-line text-ink/70"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-8 mt-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block space-y-6">
          <div>
            <Link
              href={params.verified === "true" ? "/browse" : "/browse?verified=true"}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg ${
                params.verified === "true" ? "bg-navy text-white" : "bg-canvas2 text-ink"
              }`}
            >
              <BadgeCheck size={14} /> Verified only
            </Link>
          </div>
          <div>
            <h4 className="font-semibold text-ink text-sm mb-3">Service</h4>
            <ul className="space-y-2 text-sm text-stone">
              {SUBCATEGORIES.map((s) => (
                <li key={s}>
                  <Link href={`/browse?sub=${encodeURIComponent(s)}`} className="hover:text-terra-dim">{s}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-ink text-sm mb-3">Area</h4>
            <ul className="space-y-2 text-sm text-stone">
              {AREAS.map((a) => (
                <li key={a}>
                  <Link href={`/browse?area=${encodeURIComponent(a)}`} className="hover:text-terra-dim">{a}</Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Results — single column on mobile, two on larger screens */}
        <div className="grid sm:grid-cols-2 gap-4">
          {error && (
            <p className="text-sm text-red-600 col-span-2">
              Couldn't load listings — check your Supabase connection.
            </p>
          )}
          {!error && listings.length === 0 && (
            <div className="col-span-2 text-center py-16 border-2 border-dashed border-stone-line rounded-xl bg-white">
              <p className="text-stone">No businesses match yet. Be the first to get listed.</p>
              <Link href="/business/signup" className="text-terra-dim font-semibold mt-2 inline-block">
                List your business →
              </Link>
            </div>
          )}
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </div>
    </div>
  );
}

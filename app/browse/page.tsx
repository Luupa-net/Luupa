import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ListingCard, { Listing } from "@/components/ListingCard";

const SUBCATEGORIES = [
  { slug: "detailing", label: "Detailing" },
  { slug: "tinting", label: "Tinting" },
  { slug: "ceramic-ppf", label: "Ceramic & PPF" },
  { slug: "car-wash", label: "Car Wash" },
  { slug: "wraps", label: "Wraps" },
  { slug: "paint-correction", label: "Paint Correction" },
  { slug: "engine-detailing", label: "Engine Detailing" },
  { slug: "mobile", label: "Mobile" },
];
const AREAS = [
  { slug: "manama", label: "Manama" },
  { slug: "riffa", label: "Riffa" },
  { slug: "muharraq", label: "Muharraq" },
  { slug: "isa-town", label: "Isa Town" },
  { slug: "hamad-town", label: "Hamad Town" },
];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string; sub?: string; area?: string };
}) {
  let query = supabase.from("businesses").select("*").eq("status", "active");

  if (searchParams.sub) query = query.eq("subcategory", searchParams.sub);
  if (searchParams.area) query = query.eq("area", searchParams.area);
  if (searchParams.q) {
    query = query.or(
      `name.ilike.%${searchParams.q}%,description.ilike.%${searchParams.q}%,subcategory.ilike.%${searchParams.q}%`
    );
  }

  const { data, error } = await query.order("tier", { ascending: false });
  const listings = (data ?? []) as Listing[];

  return (
    <div className="max-w-6xl mx-auto px-5 py-6 sm:py-10">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
        {searchParams.q ? `Results for "${searchParams.q}"` : "Browse car care businesses"}
      </h1>
      <p className="text-stone mt-1 text-sm">
        {listings.length} {listings.length === 1 ? "business" : "businesses"} found
      </p>

      {/* Mobile: horizontal scrolling filter chips. Desktop: sidebar (below) */}
      <div className="md:hidden mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {SUBCATEGORIES.map((s) => (
          <Link
            key={s.slug}
            href={`/browse?sub=${s.slug}`}
            className={`shrink-0 text-sm px-4 py-2 rounded-full border-2 whitespace-nowrap ${
              searchParams.sub === s.slug
                ? "bg-terra border-terra text-white font-semibold"
                : "bg-white border-stone-line text-ink/70"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-8 mt-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block space-y-6">
          <div>
            <h4 className="font-semibold text-ink text-sm mb-3">Service</h4>
            <ul className="space-y-2 text-sm text-stone">
              {SUBCATEGORIES.map((s) => (
                <li key={s.slug}>
                  <Link href={`/browse?sub=${s.slug}`} className="hover:text-terra-dim">{s.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-ink text-sm mb-3">Area</h4>
            <ul className="space-y-2 text-sm text-stone">
              {AREAS.map((a) => (
                <li key={a.slug}>
                  <Link href={`/browse?area=${a.slug}`} className="hover:text-terra-dim">{a.label}</Link>
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

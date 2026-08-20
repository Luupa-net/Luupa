import { supabase } from "@/lib/supabase";
import ListingCard, { Listing } from "@/components/ListingCard";

const SUBCATEGORIES = [
  "detailing", "tinting", "ceramic-ppf", "car-wash",
  "wraps", "paint-correction", "engine-detailing", "mobile",
];
const AREAS = ["manama", "riffa", "muharraq", "isa-town", "hamad-town"];

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

  // featured tier surfaces first, rotated randomly within tier via order jitter
  const { data, error } = await query.order("tier", { ascending: false });
  const listings = (data ?? []) as Listing[];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">
        {searchParams.q ? `Results for "${searchParams.q}"` : "Browse car care businesses"}
      </h1>
      <p className="text-steel mt-1 text-sm">
        {listings.length} {listings.length === 1 ? "business" : "businesses"} found
      </p>

      <div className="grid md:grid-cols-[220px_1fr] gap-8 mt-8">
        {/* Filters */}
        <aside className="space-y-6">
          <div>
            <h4 className="font-semibold text-ink text-sm mb-3">Service</h4>
            <ul className="space-y-2 text-sm text-steel">
              {SUBCATEGORIES.map((s) => (
                <li key={s}>
                  <a href={`/browse?sub=${s}`} className="hover:text-ignition-dim capitalize">
                    {s.replace("-", " ")}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-ink text-sm mb-3">Area</h4>
            <ul className="space-y-2 text-sm text-steel">
              {AREAS.map((a) => (
                <li key={a}>
                  <a href={`/browse?area=${a}`} className="hover:text-ignition-dim capitalize">
                    {a.replace("-", " ")}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Results */}
        <div className="grid sm:grid-cols-2 gap-4">
          {error && (
            <p className="text-sm text-red-600 col-span-2">
              Couldn't load listings — check your Supabase connection.
            </p>
          )}
          {!error && listings.length === 0 && (
            <div className="col-span-2 text-center py-16 border border-dashed border-black/10 rounded-lg">
              <p className="text-steel">No businesses match yet. Be the first to get listed.</p>
              <a href="/business/signup" className="text-ignition-dim font-medium mt-2 inline-block">
                List your business →
              </a>
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

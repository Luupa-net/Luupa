import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import HeroImage from "@/components/HeroImage";
import SlidingPrompts from "@/components/SlidingPrompts";
import ComingSoon from "@/components/ComingSoon";
import FeaturedCard from "@/components/FeaturedCard";
import type { Listing } from "@/components/ListingCard";
import { supabase } from "@/lib/supabase";
import { ArrowUpRight } from "lucide-react";

// PERMANENT FIX for the "changes don't show up" bug: without this, Next.js
// treats this page as static and bakes it in at build/deploy time, so any
// database change (new business, edited listing) never shows until the next
// deploy. This forces a fresh database read on every single visit instead.
export const revalidate = 0;

export default async function HomePage() {
  // Real featured businesses — verified ones first, then featured tier, active only
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("status", "active")
    .order("verified", { ascending: false })
    .order("tier", { ascending: false })
    .limit(8);
  const featured = (data ?? []) as Listing[];

  return (
    <div>
      {/* Hero — shorter band, centered, blurred photo, no filler subtext */}
      <section className="relative h-[300px] sm:h-[360px] flex items-center overflow-hidden">
        <HeroImage />
        <div className="relative max-w-xl mx-auto px-5 w-full text-center fade-up">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-semibold">
            Everything car care, in one place.
          </h1>
          <div className="mt-6">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Everything below flows as one continuous white surface — no alternating color blocks */}
      <div className="max-w-6xl mx-auto px-5">
        <div className="py-10 sm:py-12">
          {/* Two matched panels — same background, same shape, feel like a pair */}
          <div className="grid sm:grid-cols-2 gap-4">
            <SlidingPrompts />
            <ComingSoon />
          </div>
        </div>

        <div className="h-px bg-stone-line" />

        <section className="py-14 sm:py-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">Featured this week</h2>
            <Link href="/browse" className="text-sm text-navy font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
              Browse all <ArrowUpRight size={14} />
            </Link>
          </div>
          {featured.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-line p-10 text-center">
              <p className="text-stone text-sm">No businesses featured yet — the first ones to join get seen first.</p>
              <Link href="/business/signup" className="text-navy font-medium text-sm mt-1.5 inline-block">
                List yours first →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {featured.map((l) => (
                <FeaturedCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Founding offer — honest, time-limited, not overstated. Subtle ambient flare, no new content boxes. */}
      <section className="px-5 pb-20 sm:pb-24">
        <div className="max-w-6xl mx-auto relative bg-navy rounded-2xl px-8 py-14 sm:px-16 sm:py-16 text-center overflow-hidden">
          <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-terra/20 blur-2xl drift-slow" />
          <div className="absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl drift-slow-reverse" />

          <div className="relative">
            <span className="inline-block text-xs uppercase tracking-wide font-medium text-terra-light bg-white/10 px-3 py-1.5 rounded-full mb-4">
              Founding partner offer
            </span>
            <h2 className="font-display text-white text-3xl sm:text-4xl font-semibold max-w-lg mx-auto">
              Run a car care business? The first 10 get 3 months free.
            </h2>
            <p className="text-white/60 text-sm mt-3 max-w-sm mx-auto">
              After that, simple monthly pricing — no surprises, cancel anytime.
            </p>
            <Link
              href="/business/signup"
              className="inline-block mt-7 px-8 py-3.5 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim active:scale-[0.98] transition-all"
            >
              List your business
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import HeroImage from "@/components/HeroImage";
import SlidingPrompts from "@/components/SlidingPrompts";
import ComingSoon from "@/components/ComingSoon";
import BusinessQuickActions from "@/components/BusinessQuickActions";
import { ArrowUpRight } from "lucide-react";

export default function HomePage() {
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
          <BusinessQuickActions />

          {/* Discover — two paired panels, same height, feel like one composed section */}
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
          <div className="rounded-xl border border-dashed border-stone-line p-10 text-center">
            <p className="text-stone text-sm">No businesses featured yet — the first ones to join get seen first.</p>
            <Link href="/business/signup" className="text-navy font-medium text-sm mt-1.5 inline-block">
              List yours first →
            </Link>
          </div>
        </section>
      </div>

      {/* Founding offer — honest, time-limited, not overstated. Subtle ambient flare, no new content boxes. */}
      <section className="px-5 pb-20 sm:pb-24">
        <div className="max-w-6xl mx-auto relative bg-navy rounded-2xl px-8 py-14 sm:px-16 sm:py-16 text-center overflow-hidden">
          <div className="absolute -top-16 -left-10 w-64 h-64 rounded-full bg-terra/25 blur-3xl drift-slow" />
          <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-white/10 blur-3xl drift-slow-reverse" />

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

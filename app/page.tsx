import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import HeroImage from "@/components/HeroImage";
import { ArrowUpRight } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Split hero — text + search on left, image on right (desktop). Stacks on mobile. */}
      <section className="max-w-6xl mx-auto px-5 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
          <div className="fade-up">
            <h1 className="font-display text-ink text-[2.5rem] leading-[1.08] sm:text-6xl font-semibold max-w-lg">
              Bahrain's car care, curated.
            </h1>
            <p className="text-stone mt-4 max-w-sm text-base sm:text-lg leading-relaxed">
              Detailing, tinting, ceramic coating and customization — the shops worth knowing, matched to what you need.
            </p>
            <div className="mt-8">
              <HeroSearch />
            </div>
          </div>

          {/* Image slot — replace /public/bahrain-hero.jpg with a real photo. Falls back to a navy panel if missing. */}
          <div
            className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] rounded-2xl overflow-hidden bg-navy fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <HeroImage />
          </div>
        </div>
      </section>

      {/* Featured — appears once real listings exist, otherwise a quiet invite */}
      <section className="max-w-6xl mx-auto px-5 pb-16 sm:pb-20">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">Featured this week</h2>
          <Link href="/browse" className="text-sm text-navy font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
            Browse all <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="rounded-xl border border-dashed border-stone-line bg-canvas2 p-10 text-center">
          <p className="text-stone text-sm">No businesses featured yet.</p>
          <Link href="/business/signup" className="text-navy font-medium text-sm mt-1.5 inline-block">
            List yours first →
          </Link>
        </div>
      </section>

      {/* For businesses — single confident panel, no filler copy around it */}
      <section className="px-5 pb-20 sm:pb-24">
        <div className="max-w-6xl mx-auto bg-navy rounded-2xl px-8 py-14 sm:px-16 sm:py-16 text-center">
          <h2 className="font-display text-white text-3xl sm:text-4xl font-semibold max-w-lg mx-auto">
            Get found by customers already looking for you.
          </h2>
          <Link
            href="/business/signup"
            className="inline-block mt-7 px-8 py-3.5 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim active:scale-[0.98] transition-all"
          >
            List your business — free
          </Link>
        </div>
      </section>
    </div>
  );
}

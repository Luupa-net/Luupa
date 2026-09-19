import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import SlidingPrompts from "@/components/SlidingPrompts";
import ComingSoon from "@/components/ComingSoon";
import FeaturedCard from "@/components/FeaturedCard";
import Reveal from "@/components/Reveal";
import type { Listing } from "@/components/ListingCard";
import { supabase } from "@/lib/supabase";
import { SUBCATEGORIES } from "@/lib/taxonomy";
import {
  ArrowUpRight, Check, Search as SearchIcon, MessageCircle, BadgeCheck,
  Sparkles, Blinds, ShieldCheck, Droplets, Palette, Paintbrush2, Wrench, Car,
  type LucideIcon,
} from "lucide-react";

// Keyed off lib/taxonomy's SUBCATEGORIES (the source of truth used for
// filtering /browse?sub=...) rather than a separate hardcoded list, so the
// homepage grid can't silently drift out of sync with the real categories.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Detailing": Sparkles,
  "Window Tinting": Blinds,
  "Ceramic Coating & PPF": ShieldCheck,
  "Car Wash": Droplets,
  "Wraps & Vinyl": Palette,
  "Paint Correction": Paintbrush2,
  "Engine Detailing": Wrench,
  "Mobile Detailing": Car,
};

// Real database read on every visit, refreshed at most every 30s — see git
// history for why this specific value matters (fixed a real slowness bug).
export const revalidate = 30;

export default async function HomePage() {
  // SECURITY: query the businesses_public VIEW, not the businesses table —
  // it already projects down to a public-safe column list and only ever
  // contains active rows, so this is safe against direct REST access with
  // the anon key too, not just against what this page happens to ask for.
  const { data } = await supabase
    .from("businesses_public")
    .select("id, name, photos, areas, verified, verified_until, tier")
    .order("verified", { ascending: false })
    .order("tier", { ascending: false })
    .limit(8);
  const featured = (data ?? []) as unknown as Listing[];

  return (
    <div className="bg-cream">
      {/* HERO — a calm, centered moment: mark, categories, one small search bar.
          No competing hero image/map; the category grid itself is the visual. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-navy/[0.06] blur-3xl drift-slow pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.4]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(20,24,31,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent)",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-5 pt-16 sm:pt-24 pb-6 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 bg-ink text-cream text-xs font-bodyAlt font-semibold px-4 py-2 rounded-full mb-7">
              Now onboarding founding businesses in Bahrain
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-displayAlt text-4xl sm:text-5xl lg:text-6xl leading-[1.02] font-bold tracking-tight text-ink mb-4">
              Everything car care,<br />in one <span className="text-teal">place.</span>
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="font-bodyAlt text-base sm:text-lg text-stone mb-10 max-w-xl mx-auto leading-relaxed">
              Real, reviewed detailing shops, tinting studios and ceramic coating pros — no more guessing from a random Instagram post.
            </p>
          </Reveal>
        </div>

        {/* CATEGORIES — the primary way in, front and center */}
        <Reveal delay={180} className="relative max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
            {SUBCATEGORIES.map((name) => {
              const Icon = CATEGORY_ICONS[name] || Sparkles;
              return (
                <Link
                  key={name}
                  href={`/browse?sub=${encodeURIComponent(name)}`}
                  className="group flex flex-col items-center text-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-sm border border-stone-line rounded-2xl px-2 py-4 sm:px-4 sm:py-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-teal/40"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal/10 text-teal-dim flex items-center justify-center group-hover:bg-teal group-hover:text-white transition-colors">
                    <Icon size={20} />
                  </div>
                  <span className="font-bodyAlt text-[11px] sm:text-sm font-semibold text-ink leading-tight">{name}</span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {/* SEARCH — one small, centered bar under the categories */}
        <Reveal delay={240} className="relative max-w-4xl mx-auto px-5 pt-8 pb-16 sm:pb-20">
          <HeroSearch compact />
        </Reveal>
      </section>

      {/* TRUST STRIP */}
      <section className="max-w-6xl mx-auto px-5 pb-16 sm:pb-20 flex flex-wrap justify-center gap-x-10 gap-y-3 font-bodyAlt">
        {["Free to list, always", "Every listing personally reviewed", "Built in Bahrain, for Bahrain"].map((t, i) => (
          <Reveal key={t} delay={i * 150}>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Check size={18} className="text-teal" strokeWidth={3} />
              {t}
            </div>
          </Reveal>
        ))}
      </section>

      <div className="max-w-6xl mx-auto px-5">
        {/* TWO PANELS */}
        <Reveal>
          <div className="grid sm:grid-cols-2 gap-4 pb-10 sm:pb-12">
            <SlidingPrompts />
            <ComingSoon />
          </div>
        </Reveal>

        <div className="h-px bg-stone-line" />

        {/* FEATURED */}
        <Reveal className="py-14 sm:py-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-displayAlt text-xl sm:text-2xl font-bold text-ink">Featured this week</h2>
            <Link href="/browse" className="text-sm text-teal font-bodyAlt font-bold flex items-center gap-0.5 hover:gap-1.5 transition-all">
              Browse all <ArrowUpRight size={14} />
            </Link>
          </div>
          {featured.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-line p-10 text-center">
              <p className="text-stone text-sm">No businesses featured yet — the first ones to join get seen first.</p>
              <Link href="/business/signup" className="text-teal font-bodyAlt font-bold text-sm mt-1.5 inline-block">
                List yours first →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {featured.map((l, i) => (
                <Reveal key={l.id} delay={i * 90}>
                  <FeaturedCard listing={l} />
                </Reveal>
              ))}
            </div>
          )}
        </Reveal>
      </div>

      {/* HOW IT WORKS */}
      <Reveal className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
        <h2 className="font-displayAlt text-2xl sm:text-3xl font-bold text-ink text-center mb-12">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: SearchIcon, title: "Search your area", body: "Tell us what you need and where." },
            { icon: Check, title: "Compare real profiles", body: "Photos, prices, and a verified badge." },
            { icon: MessageCircle, title: "Message on WhatsApp", body: "Straight to the business, no middleman." },
          ].map((step, i) => (
            <div key={step.title}>
              <div className="w-14 h-14 rounded-2xl bg-teal text-white font-displayAlt font-bold text-xl flex items-center justify-center mx-auto mb-5">
                {i + 1}
              </div>
              <p className="font-displayAlt text-lg font-bold text-ink mb-1.5">{step.title}</p>
              <p className="font-bodyAlt text-sm text-stone">{step.body}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* VERIFIED, EXPLAINED — to customers first (what it means for them), then the business pitch */}
      <Reveal>
        <div className="max-w-3xl mx-auto px-5 pt-4 pb-16 sm:pb-20">
          <div className="bg-skyblue/10 rounded-2xl px-7 py-9 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-skyblue text-white flex items-center justify-center shrink-0">
                <BadgeCheck size={26} />
              </div>
              <div className="flex-1">
                <p className="font-displayAlt font-bold text-lg text-ink mb-1.5">What the verified badge means</p>
                <p className="text-sm text-stone font-bodyAlt leading-relaxed">
                  A blue checkmark on a listing means that business has been personally checked, not just self-submitted — it's the clearest sign on Luupa that who you're contacting is real and trustworthy.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-skyblue/20">
              <p className="text-sm text-stone font-bodyAlt">Run a business? Get verified free as one of our first 10.</p>
              <Link
                href="/business/verify"
                className="shrink-0 px-6 py-3 rounded-full bg-skyblue text-white font-bodyAlt font-bold text-sm hover:bg-skyblue-dim transition-colors"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* FOUNDING OFFER */}
      <Reveal className="px-5 pb-20 sm:pb-24">
        <div className="max-w-6xl mx-auto relative bg-ink rounded-[32px] px-8 py-14 sm:px-16 sm:py-20 text-center overflow-hidden">
          <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full bg-teal/25 blur-2xl" />
          <div className="absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-skyblue/20 blur-2xl" />

          <div className="relative">
            <span className="inline-block text-xs font-bodyAlt uppercase tracking-wide font-bold text-skyblue bg-white/10 px-3 py-1.5 rounded-full mb-5">
              Founding partner offer
            </span>
            <h2 className="font-displayAlt text-white text-3xl sm:text-4xl font-bold max-w-lg mx-auto leading-tight">
              Run a car care business? The first 10 get verified, completely free.
            </h2>
            <p className="text-white/60 font-bodyAlt text-sm mt-3 max-w-sm mx-auto">
              Listing is always free. Verification normally carries a small fee — not for our first 10.
            </p>
            <Link
              href="/business/signup"
              className="inline-block mt-8 px-9 py-4 rounded-full bg-teal text-white font-bodyAlt font-bold hover:bg-teal-dim active:scale-[0.98] transition-all"
            >
              List your business
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

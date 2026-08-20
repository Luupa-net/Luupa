import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import HeroImage from "@/components/HeroImage";
import { ArrowUpRight, Eye, MessageCircleMore, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Full-bleed hero — photo, gradient, headline, search and ticker fused into one scene */}
      <section className="relative min-h-[560px] sm:min-h-[620px] flex items-end overflow-hidden">
        <HeroImage />
        <div className="relative max-w-6xl mx-auto px-5 pb-12 sm:pb-16 w-full fade-up">
          <h1 className="font-display text-white text-[2.5rem] leading-[1.06] sm:text-6xl font-semibold max-w-xl">
            The shop you'd tell a friend about — before you find them yourself.
          </h1>
          <p className="text-white/75 mt-4 max-w-md text-base sm:text-lg leading-relaxed">
            Detailing, tinting, ceramic coating and customization across Bahrain, matched to what you're actually looking for.
          </p>
          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Featured — appears once real listings exist, otherwise a quiet invite */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">Featured this week</h2>
          <Link href="/browse" className="text-sm text-navy font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
            Browse all <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="rounded-xl border border-dashed border-stone-line bg-canvas2 p-10 text-center">
          <p className="text-stone text-sm">No businesses featured yet — the first ones to join get seen first.</p>
          <Link href="/business/signup" className="text-navy font-medium text-sm mt-1.5 inline-block">
            List yours first →
          </Link>
        </div>
      </section>

      {/* Why list — real reasoning, not filler, adds substance while the directory is still empty */}
      <section className="bg-canvas2 px-5 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink max-w-md">
            Bahrain searches for car care every day. Most of it never reaches you.
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 mt-10">
            <Reason
              icon={<Eye size={20} className="text-navy" />}
              title="Show up when it counts"
              text="Someone searching 'ceramic coating Riffa' finds a real answer — your shop, not a scroll of unrelated posts."
            />
            <Reason
              icon={<MessageCircleMore size={20} className="text-navy" />}
              title="They message you directly"
              text="No booking fees, no middleman taking a cut. A customer taps through and reaches you on WhatsApp, same as always."
            />
            <Reason
              icon={<ShieldCheck size={20} className="text-navy" />}
              title="Trust, built in"
              text="A verified badge and a real profile do the convincing before the first message is even sent."
            />
          </div>
        </div>
      </section>

      {/* For businesses — single confident panel */}
      <section className="px-5 py-20 sm:py-24">
        <div className="max-w-6xl mx-auto bg-navy rounded-2xl px-8 py-14 sm:px-16 sm:py-16 text-center">
          <h2 className="font-display text-white text-3xl sm:text-4xl font-semibold max-w-lg mx-auto">
            Free to join. No catch, no contract.
          </h2>
          <Link
            href="/business/signup"
            className="inline-block mt-7 px-8 py-3.5 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim active:scale-[0.98] transition-all"
          >
            List your business
          </Link>
        </div>
      </section>
    </div>
  );
}

function Reason({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="text-stone mt-1.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

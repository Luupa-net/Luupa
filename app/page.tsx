import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import { ShieldCheck, MapPin, MessageCircle, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero — light, warm, energetic. Mobile-first sizing (text scales up at sm/md breakpoints) */}
      <section className="pt-10 pb-12 sm:pt-16 sm:pb-16 px-5">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-coral tracking-[0.25em] text-xs uppercase mb-3">
            Bahrain · Car Care & Customization
          </p>
          <h1 className="font-display text-ink text-[2.6rem] leading-[1.05] sm:text-6xl font-semibold max-w-2xl">
            Find your spot.<br />Get your car right.
          </h1>
          <p className="text-stone mt-4 max-w-md text-base sm:text-lg">
            Bahrain's best detailing, tinting, ceramic coating and customization shops — matched to what you need.
          </p>
          <div className="mt-7">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Trust strip — quick, scannable, builds "I will buy this" confidence fast on mobile */}
      <section className="bg-teal text-white py-3 px-5">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-6 text-xs sm:text-sm font-medium flex-wrap">
          <span className="flex items-center gap-1.5"><ShieldCheck size={15}/> Verified businesses</span>
          <span className="flex items-center gap-1.5"><MessageCircle size={15}/> Direct WhatsApp contact</span>
          <span className="flex items-center gap-1.5"><MapPin size={15}/> All across Bahrain</span>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-5 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <Step number="1" title="Search" text="Tell us what you need — a shop, a service, or an area of Bahrain." />
          <Step number="2" title="Compare" text="See verified profiles with real photos, services, and pricing." />
          <Step number="3" title="Contact directly" text="Reach out on WhatsApp or by phone — no fees, no middleman." />
        </div>
      </section>

      {/* Featured teaser — placeholder pattern for when real featured listings exist */}
      <section className="bg-canvas2 py-14 sm:py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Popular right now</h2>
            <Link href="/browse" className="text-coral-dim text-sm font-semibold flex items-center gap-1">
              See all <ArrowRight size={14}/>
            </Link>
          </div>
          <div className="rounded-xl border-2 border-dashed border-stone-line bg-white p-8 text-center">
            <p className="text-stone">Featured businesses will appear here once listed.</p>
            <Link href="/business/signup" className="text-coral-dim font-semibold text-sm mt-2 inline-block">
              Be the first →
            </Link>
          </div>
        </div>
      </section>

      {/* For businesses CTA */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink">Run a car care business in Bahrain?</h2>
        <p className="text-stone mt-3 max-w-md mx-auto">
          Get discovered by customers actively searching for your services — right now, for free.
        </p>
        <Link
          href="/business/signup"
          className="inline-block mt-6 px-8 py-4 rounded-full bg-coral text-white font-semibold hover:bg-coral-dim active:scale-95 transition-all shadow-lg shadow-coral/20"
        >
          List your business
        </Link>
      </section>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div>
      <div className="w-9 h-9 rounded-full bg-coral text-white font-display font-semibold flex items-center justify-center mb-3 text-sm">
        {number}
      </div>
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="text-stone mt-1.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

import Link from "next/link";
import HeroSearch from "@/components/HeroSearch";
import { ShieldCheck, MapPin, MessageCircle } from "lucide-react";

const SUBCATEGORIES = [
  { slug: "detailing", label: "Detailing" },
  { slug: "tinting", label: "Window Tinting" },
  { slug: "ceramic-ppf", label: "Ceramic & PPF" },
  { slug: "car-wash", label: "Car Wash" },
  { slug: "wraps", label: "Wraps & Vinyl" },
  { slug: "paint-correction", label: "Paint Correction" },
  { slug: "engine-detailing", label: "Engine Detailing" },
  { slug: "mobile", label: "Mobile Detailing" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-graphite pt-20 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-ignition tracking-[0.3em] text-xs uppercase mb-4">
            Bahrain · Car Care & Customization
          </p>
          <h1 className="font-display text-canvas text-5xl sm:text-6xl font-semibold leading-[1.05] max-w-2xl">
            Find them once. Come back every time.
          </h1>
          <p className="text-titanium mt-5 max-w-lg text-lg">
            The curated directory for Bahrain's best detailing, tinting, ceramic coating
            and customization shops — matched to exactly what you're looking for.
          </p>
          <div className="mt-8">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Browse by subcategory */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-display text-3xl font-semibold text-ink mb-8">Browse by service</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SUBCATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/browse?sub=${c.slug}`}
              className="group border border-black/10 rounded-lg p-5 hover:border-ignition hover:shadow-md transition-all bg-white"
            >
              <span className="text-ink font-medium group-hover:text-ignition-dim transition-colors">
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-black/5 py-16">
        <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-10">
          <Step icon={<MessageCircle className="text-ignition" size={22} />} title="Search" text="Tell us what you need — a shop, a service, or an area of Bahrain." />
          <Step icon={<ShieldCheck className="text-ignition" size={22} />} title="Compare" text="See verified profiles with real photos, services, and pricing." />
          <Step icon={<MapPin className="text-ignition" size={22} />} title="Contact directly" text="Reach out on WhatsApp or by phone — no middleman, no booking fees." />
        </div>
      </section>

      {/* For businesses CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold text-ink">Run a car care business in Bahrain?</h2>
        <p className="text-steel mt-3 max-w-md mx-auto">
          Get discovered by customers actively searching for your services — right now, for free.
        </p>
        <Link
          href="/business/signup"
          className="inline-block mt-6 px-7 py-3 rounded-md bg-ignition text-white font-semibold hover:bg-ignition-dim transition-colors"
        >
          List your business
        </Link>
      </section>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-full bg-ignition/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="text-steel mt-2 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

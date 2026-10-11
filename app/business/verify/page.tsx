import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, TrendingUp, MessageCircle, BadgeCheck, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "Get verified — Luupa for Business" };

// Luupa's own support WhatsApp (digits with country code, e.g. 9733xxxxxxx).
// Until it's configured, the button emails instead — it used to point at a
// placeholder number (97300000000) that reached nobody.
const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");
const SUPPORT_EMAIL = "luupa.net@gmail.com";
const VERIFY_MESSAGE = "Hi, I'd like to get verified on Luupa";

export default function VerifyPage() {
  const contactHref = SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(VERIFY_MESSAGE)}`
    : `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Verification on Luupa")}&body=${encodeURIComponent(`${VERIFY_MESSAGE}.\n\nBusiness name: `)}`;
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center mb-5">
        <ShieldCheck size={24} className="text-navy" />
      </div>
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">Get verified</h1>
      <p className="text-stone mt-3 leading-relaxed">
        A verified badge tells customers you've been personally checked — not just an open listing
        anyone could post. It shows next to your name everywhere on Luupa: search results, your
        profile, and your account.
      </p>

      <div className="space-y-5 mt-9">
        <Benefit
          icon={<BadgeCheck size={18} className="text-navy" />}
          title="A visible trust badge"
          text="Shown on your listing card, your full profile, and next to your name across the site."
        />
        <Benefit
          icon={<TrendingUp size={18} className="text-navy" />}
          title="More confidence, faster replies"
          text="Customers are more likely to message a verified business first — it removes the 'is this real' hesitation."
        />
        <Benefit
          icon={<MessageCircle size={18} className="text-navy" />}
          title="A quick, personal check"
          text="We manually confirm your business is real using what you provide — no lengthy paperwork required."
        />
      </div>

      {/* Pricing — 4 tiers, longer commitment = lower effective monthly rate */}
      <div className="mt-10 rounded-2xl bg-canvas2 p-7">
        <p className="text-xs uppercase tracking-wide text-stone font-medium">Verification pricing</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <PriceTier length="1 month" price="5" />
          <PriceTier length="3 months" price="8" />
          <PriceTier length="6 months" price="14" />
          <PriceTier length="12 months" price="24" best />
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-teal/10 px-4 py-3">
          <Sparkles size={16} className="text-teal-dim shrink-0 mt-0.5" />
          <p className="text-sm text-ink">
            <b>Founding partner?</b> The first 10 businesses on Luupa get verified free — just get in touch below.
          </p>
        </div>

        <div className="h-px bg-stone-line my-5" />

        <p className="text-sm font-medium text-ink">How to pay right now</p>
        <p className="text-sm text-stone mt-1.5 leading-relaxed">
          Payments aren't automated yet — {SUPPORT_WHATSAPP ? "message us on WhatsApp" : "email us"} to arrange payment
          (BenefitPay or bank transfer both work). Once received, your badge is added within a day.
        </p>
        <a
          href={contactHref}
          target={SUPPORT_WHATSAPP ? "_blank" : undefined}
          rel={SUPPORT_WHATSAPP ? "noopener noreferrer" : undefined}
          className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim active:scale-[0.98] transition-all"
        >
          {SUPPORT_WHATSAPP ? <MessageCircle size={16} /> : <Mail size={16} />}
          {SUPPORT_WHATSAPP ? "Message us on WhatsApp" : "Email us to get verified"}
        </a>
      </div>

      <p className="text-sm text-stone mt-8">
        <Link href="/business/dashboard" className="text-navy font-medium">← Back to dashboard</Link>
      </p>
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3.5">
      <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <h3 className="font-medium text-ink">{title}</h3>
        <p className="text-stone mt-0.5 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function PriceTier({ length, price, best }: { length: string; price: string; best?: boolean }) {
  return (
    <div className={`rounded-xl p-3.5 text-center ${best ? "bg-navy" : "bg-white border border-stone-line"}`}>
      {best && <p className="text-[10px] uppercase tracking-wide text-teal-light font-semibold mb-1">Best value</p>}
      <p className={`font-display text-2xl font-semibold ${best ? "text-white" : "text-ink"}`}>BHD {price}</p>
      <p className={`text-xs mt-0.5 ${best ? "text-white/70" : "text-stone"}`}>{length}</p>
    </div>
  );
}

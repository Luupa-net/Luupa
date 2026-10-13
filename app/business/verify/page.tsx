import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, TrendingUp, MessageCircle, BadgeCheck, Send, Sparkles } from "lucide-react";
import { supportWhatsAppHref } from "@/lib/support";

export const metadata: Metadata = { title: "Get verified — Luupa for Business" };

const VERIFY_MESSAGE = "Hi, I'd like to get verified on Luupa";

export default function VerifyPage() {
  // WhatsApp when Luupa's support number is configured; otherwise the
  // contact form, pre-set to the verification topic.
  const whatsappHref = supportWhatsAppHref(VERIFY_MESSAGE);
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

      {/* Free during launch. The paid tiers (BHD 5 / 8 / 14 / 24 for 1 / 3 / 6 /
          12 months) come back here once launch pricing ends — see git history
          for the old PriceTier grid. */}
      <div className="mt-10 rounded-2xl bg-canvas2 p-7">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-stone font-medium">
          <Sparkles size={13} className="text-teal-dim" /> Verification pricing
        </p>
        <p className="font-display text-3xl font-semibold text-ink mt-2">Free during launch</p>
        <p className="text-sm text-stone mt-1.5 leading-relaxed">
          No payment needed while we launch. When paid plans arrive, you'll get at least 30 days' notice, and
          businesses that joined during launch keep a lower rate.
        </p>

        <div className="h-px bg-stone-line my-5" />

        <p className="text-sm font-medium text-ink">How to get verified</p>
        <p className="text-sm text-stone mt-1.5 leading-relaxed">
          Send us your business name. We'll check your details and add your badge, usually within a day.
        </p>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim active:scale-[0.98] transition-all"
          >
            <MessageCircle size={16} /> Message us on WhatsApp
          </a>
        ) : (
          <Link
            href="/contact?topic=verification"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim active:scale-[0.98] transition-all"
          >
            <Send size={16} /> Request verification
          </Link>
        )}
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

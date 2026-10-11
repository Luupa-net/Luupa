import Link from "next/link";
import type { Metadata } from "next";
import SignupWizard from "@/components/SignupWizard";
import { Eye, MessageCircleMore, ShieldCheck, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "List your car care business — Luupa",
  description: "Get found by drivers across Bahrain, take bookings online, check out customers in one tap and collect real reviews.",
};

export default function BusinessSignup() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-14">
      {/* Pitch — belongs here, in business context, not on the customer-facing homepage */}
      <div>
        <span className="inline-block text-xs uppercase tracking-wide font-medium text-teal-dim bg-teal/10 px-3 py-1.5 rounded-full mb-4">
          Founding partner offer — first 10 businesses
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight">
          Bahrain searches for car care every day. Most of it never reaches you.
        </h1>
        <p className="text-stone mt-3">
          3 months free for the first 10 businesses. After that, simple monthly pricing — no surprises, cancel anytime.
        </p>

        <div className="space-y-6 mt-10">
          <Reason
            icon={<Eye size={18} className="text-navy" />}
            title="Show up when it counts"
            text="Someone searching 'ceramic coating Riffa' finds a real answer — your shop, not a scroll of unrelated posts."
          />
          <Reason
            icon={<MessageCircleMore size={18} className="text-navy" />}
            title="They message you directly"
            text="No booking fees, no middleman taking a cut. A customer taps through and reaches you on WhatsApp, same as always."
          />
          <Reason
            icon={<ShieldCheck size={18} className="text-navy" />}
            title="Trust, built in"
            text="A verified badge, real reviews and a real profile do the convincing before the first message is even sent."
          />
          <Reason
            icon={<LayoutDashboard size={18} className="text-navy" />}
            title="Run your whole day from one screen"
            text="A live booking calendar with instant alerts, one-tap checkout with emailed and WhatsApp receipts, automatic review requests, staff logins with their own PINs, and every customer's history in one place."
          />
        </div>

        <p className="text-sm text-stone mt-10">
          Already listed? <Link href="/account/login" className="text-teal-dim font-medium">Log in</Link>
        </p>
      </div>

      {/* Multi-step signup — collects everything needed, ends with a review screen before submitting */}
      <SignupWizard />
    </div>
  );
}

function Reason({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3.5">
      <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        <p className="text-stone mt-0.5 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/support";

const FAQS = [
  { q: "Is listing my business really free?", a: "Yes — your listing is free, always, for every business, with no catch and no expiry." },
  { q: "Will the rest of Luupa always be free?", a: "Everything else — online bookings, receipts, staff logins and the verified badge — is free while we launch. When paid plans arrive, you'll get at least 30 days' notice, and businesses that joined during launch keep a lower rate." },
  { q: "How does the verified badge work?", a: "It shows customers you've been personally checked, not just an open listing. Verification is free during launch — request it from the Get verified page in your dashboard and it's usually added within a day." },
  { q: "How do I get approved?", a: "Every listing is personally reviewed before it goes live — usually within a day of signing up." },
  { q: "Can I edit or remove my listing anytime?", a: `Yes. Edit your details anytime from your dashboard (changes to a live listing go live once we've had a quick look). To remove your listing, email ${SUPPORT_EMAIL} from your account email and it's taken down within a day.` },
  { q: "What do I need to sign up?", a: "Just your business details, a few photos, and the services you offer. Takes about 5 minutes." },
  { q: "What do I get beyond the listing?", a: "A full booking calendar, one-tap checkout with emailed and WhatsApp receipts, automatic review requests, a customer list with visit history and notes, staff logins with their own PINs, and live alerts the moment a booking comes in." },
  { q: "How do customers pay?", a: "Directly to you — cash, card, or BenefitPay. Luupa never handles the money; you record the payment at checkout and the customer gets a receipt." },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="max-w-3xl mx-auto px-5 py-16 sm:py-20">
      <h2 className="font-displayAlt text-2xl sm:text-3xl font-bold text-ink text-center mb-2">Questions from businesses</h2>
      <p className="text-stone font-bodyAlt text-center mb-10">Everything you'd want to know before listing.</p>

      <div className="space-y-2.5">
        {FAQS.map((item, i) => (
          <div key={item.q} className="border border-stone-line rounded-2xl overflow-hidden bg-white">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-bodyAlt font-semibold text-ink">{item.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-stone transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <p className="px-5 pb-4 text-sm text-stone font-bodyAlt leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-canvas2 px-6 py-7 text-center">
        <p className="font-displayAlt font-bold text-ink">Still have a question?</p>
        <p className="text-sm text-stone font-bodyAlt mt-1">Send us a message and we'll get back to you, usually the same day.</p>
        <Link
          href="/contact"
          className="inline-block mt-4 px-6 py-3 rounded-full bg-teal text-white font-bodyAlt font-bold text-sm hover:bg-teal-dim active:scale-[0.98] transition-all"
        >
          Contact us
        </Link>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "Is listing my business really free?", a: "Yes — always, for every business, with no catch and no expiry." },
  { q: "How does the verified badge work?", a: "Verification normally carries a small fee, but as one of our first 10 founding businesses, it's completely free. It shows customers you've been personally checked, not just an open listing." },
  { q: "How do I get approved?", a: "Every listing is personally reviewed before it goes live — usually within a day of signing up." },
  { q: "Can I stop or remove my listing anytime?", a: "Yes, anytime, directly from your dashboard — no need to ask anyone." },
  { q: "What do I need to sign up?", a: "Just your business details, a few photos, and the services you offer. Takes about 5 minutes." },
];

export default function BusinessFAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="help" className="max-w-3xl mx-auto px-5 py-16 sm:py-20">
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

      <p className="text-center text-sm text-stone font-bodyAlt mt-8">
        Still have a question?{" "}
        <a href="mailto:luupa.net@gmail.com" className="text-coral font-bold">luupa.net@gmail.com</a>
      </p>
    </section>
  );
}

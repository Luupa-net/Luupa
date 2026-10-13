import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = { title: "Terms & Conditions — Luupa" };

// A fixed date, not new Date() — see app/privacy/page.tsx.
const LAST_UPDATED = "11 October 2026";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16 sm:py-20">
      <h1 className="font-displayAlt text-3xl sm:text-4xl font-bold text-ink mb-3">Terms &amp; Conditions</h1>
      <p className="text-sm text-stone mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6 text-stone font-bodyAlt leading-relaxed text-sm">
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">1. About Luupa</h2>
          <p>Luupa is a directory and booking platform connecting customers in Bahrain with car care businesses. Luupa does not perform car care services itself and is not a party to any transaction between a customer and a listed business.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">2. Listings</h2>
          <p>Businesses are personally reviewed before being listed. A listing does not constitute a guarantee of quality, and Luupa is not responsible for the accuracy of information a business provides about itself.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">3. Bookings and payments</h2>
          <p>A booking made on Luupa is a request until the business confirms it. Prices, timing and the service itself are agreed between you and the business, and payment is made directly to the business. Luupa is not responsible for the outcome of that arrangement, including cancellations and refunds.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">4. Reviews</h2>
          <p>Reviews can only be left after a completed booking and must reflect a genuine experience. Abusive, false or private-information-sharing reviews may be hidden. Businesses can respond publicly but cannot remove reviews; they can report them to Luupa for a decision.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">5. Account use</h2>
          <p>You're responsible for keeping your account credentials (including staff PINs) secure and for the accuracy of the information you submit. Business owners are responsible for the staff accounts they create.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">6. Changes</h2>
          <p>These terms may be updated from time to time. Continued use of Luupa after a change means you accept the updated terms.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">7. Contact</h2>
          <p>Questions about these terms can be sent to <a href={`mailto:${SUPPORT_EMAIL}`} className="text-teal font-semibold">{SUPPORT_EMAIL}</a>.</p>
        </section>
      </div>
    </div>
  );
}

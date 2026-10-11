import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — Luupa" };

// A fixed date, not new Date() — the old version showed "today" on every
// visit, so the policy always looked freshly (and suspiciously) rewritten.
const LAST_UPDATED = "11 October 2026";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16 sm:py-20">
      <h1 className="font-displayAlt text-3xl sm:text-4xl font-bold text-ink mb-3">Privacy Policy</h1>
      <p className="text-sm text-stone mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-6 text-stone font-bodyAlt leading-relaxed text-sm">
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Information we collect</h2>
          <p>
            <b className="text-ink">Customers:</b> your name, email, phone number, any vehicles you save, your booking requests and their
            status, and reviews you choose to post. <b className="text-ink">Businesses:</b> business details, contact information, photos,
            services and prices, and the bookings, payments and customer notes you record. <b className="text-ink">Staff:</b> the name,
            phone number and (optionally) ID number a business owner adds for you.
          </p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">How it's used</h2>
          <p>
            Business listings are shown publicly. When you book, your name, contact details, vehicle and booking details are shared with
            that business only, so they can serve you. Reviews are shown publicly with your first name and last initial. We use your email
            to send booking confirmations, reminders, receipts and review requests.
          </p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Payments</h2>
          <p>Luupa doesn't process payments — you pay the business directly. A business records how you paid so it can send you a receipt.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Third parties</h2>
          <p>
            Luupa uses Supabase (data storage and sign-in), Vercel (hosting), Resend (email delivery), and Google if you choose to sign in
            with Google. Messages a business sends you on WhatsApp are sent from their own WhatsApp. Luupa does not sell personal
            information to anyone.
          </p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Your choices</h2>
          <p>
            You can update your profile and vehicles, edit or delete your reviews (until the business has responded), and cancel upcoming
            bookings from your account at any time. To have your account or listing deleted, email us from the address on your account.
          </p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Contact</h2>
          <p>Questions about this policy can be sent to <a href="mailto:luupa.net@gmail.com" className="text-teal font-semibold">luupa.net@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  );
}

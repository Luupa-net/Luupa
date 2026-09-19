export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16 sm:py-20">
      <h1 className="font-displayAlt text-3xl sm:text-4xl font-bold text-ink mb-3">Privacy Policy</h1>
      <p className="text-sm text-stone mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-stone font-bodyAlt leading-relaxed text-sm">
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Information we collect</h2>
          <p>When a business signs up: business details, contact information, and photos they choose to upload. When a customer submits an inquiry or booking request: their name and contact details, so the business can respond.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">How it's used</h2>
          <p>Business information is shown publicly as part of their listing. Customer inquiry details are shared only with the specific business a customer contacted, so that business can respond.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Third parties</h2>
          <p>Luupa uses Supabase for data storage and authentication, and may use email or WhatsApp to deliver messages you or a business initiate. Luupa does not sell personal information to third parties.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Your choices</h2>
          <p>Businesses can edit or request removal of their listing at any time. Contact us if you'd like something about your data changed or removed.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">Contact</h2>
          <p>Questions about this policy can be sent to <a href="mailto:luupa.net@gmail.com" className="text-teal font-semibold">luupa.net@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  );
}

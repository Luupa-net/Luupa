export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16 sm:py-20">
      <h1 className="font-displayAlt text-3xl sm:text-4xl font-bold text-ink mb-3">Terms &amp; Conditions</h1>
      <p className="text-sm text-stone mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-stone font-bodyAlt leading-relaxed text-sm">
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">1. About Luupa</h2>
          <p>Luupa is a directory connecting customers in Bahrain with car care businesses. Luupa does not perform car care services itself and is not a party to any transaction between a customer and a listed business.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">2. Listings</h2>
          <p>Businesses are personally reviewed before being listed. A listing does not constitute a guarantee of quality, and Luupa is not responsible for the accuracy of information a business provides about itself.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">3. Contacting businesses</h2>
          <p>Any communication, booking, or payment arranged between a customer and a business (including via WhatsApp) happens directly between those two parties. Luupa is not responsible for the outcome of that arrangement.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">4. Account use</h2>
          <p>Businesses are responsible for keeping their account credentials secure and for the accuracy of the information they submit.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">5. Changes</h2>
          <p>These terms may be updated from time to time. Continued use of Luupa after a change means you accept the updated terms.</p>
        </section>
        <section>
          <h2 className="font-bodyAlt font-bold text-ink mb-2">6. Contact</h2>
          <p>Questions about these terms can be sent to <a href="mailto:luupa.net@gmail.com" className="text-coral font-semibold">luupa.net@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  );
}

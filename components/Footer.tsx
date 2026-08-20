import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-graphite text-titanium-dim mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <span className="font-display text-xl text-canvas">LUUPA</span>
          <p className="mt-3 max-w-[220px] leading-relaxed">
            Bahrain's curated directory for car care & customization. Trusted once, trusted again.
          </p>
        </div>
        <div>
          <h4 className="text-canvas font-semibold mb-3">Explore</h4>
          <ul className="space-y-2">
            <li><Link href="/browse" className="hover:text-canvas">Browse businesses</Link></li>
            <li><Link href="/browse?area=manama" className="hover:text-canvas">Manama</Link></li>
            <li><Link href="/browse?area=riffa" className="hover:text-canvas">Riffa</Link></li>
            <li><Link href="/browse?area=muharraq" className="hover:text-canvas">Muharraq</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-canvas font-semibold mb-3">For businesses</h4>
          <ul className="space-y-2">
            <li><Link href="/business/signup" className="hover:text-canvas">List your business</Link></li>
            <li><Link href="/business/login" className="hover:text-canvas">Business login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-canvas font-semibold mb-3">Contact</h4>
          <ul className="space-y-2">
            <li>hello@luupa.net</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs">
        © {new Date().getFullYear()} Luupa. All rights reserved.
      </div>
    </footer>
  );
}

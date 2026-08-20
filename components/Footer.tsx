import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-graphite text-white/60 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <span className="font-display text-xl text-white">luupa</span>
          <p className="mt-3 max-w-[220px] leading-relaxed">
            Bahrain's curated directory for car care & customization. Find your spot.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Explore</h4>
          <ul className="space-y-2">
            <li><Link href="/browse" className="hover:text-white">Browse businesses</Link></li>
            <li><Link href="/browse?area=manama" className="hover:text-white">Manama</Link></li>
            <li><Link href="/browse?area=riffa" className="hover:text-white">Riffa</Link></li>
            <li><Link href="/browse?area=muharraq" className="hover:text-white">Muharraq</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">For businesses</h4>
          <ul className="space-y-2">
            <li><Link href="/business/signup" className="hover:text-white">List your business</Link></li>
            <li><Link href="/business/login" className="hover:text-white">Business login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <ul className="space-y-2">
            <li>hello@luupa.net</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">
        © {new Date().getFullYear()} Luupa. All rights reserved.
      </div>
    </footer>
  );
}

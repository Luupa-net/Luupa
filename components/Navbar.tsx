import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-graphite/95 backdrop-blur border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-semibold text-canvas tracking-wide">
            LUUPA
          </span>
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] text-titanium-dim mt-1">
            Bahrain
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-titanium">
          <Link href="/browse" className="hover:text-canvas transition-colors">
            Browse
          </Link>
          <Link href="/business/signup" className="hover:text-canvas transition-colors">
            List your business
          </Link>
          <Link
            href="/business/login"
            className="px-4 py-2 rounded-md bg-ignition text-graphite font-semibold hover:bg-ignition-light transition-colors"
          >
            Business login
          </Link>
        </nav>
      </div>
    </header>
  );
}

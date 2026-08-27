"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Home } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-canvas/95 border-b border-stone-line">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="font-display text-2xl font-semibold text-ink tracking-wide">
            luupa
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink/80">
          <Link href="/browse" className="hover:text-ink transition-colors">Browse</Link>
          <Link href="/business/signup" className="hover:text-ink transition-colors">List your business</Link>
          <Link
            href="/business/login"
            className="px-4 py-2 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim transition-colors"
          >
            Business login
          </Link>
          <Link
            href="/"
            aria-label="Home"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink/60 hover:text-ink hover:bg-canvas2 transition-colors"
          >
            <Home size={18} />
          </Link>
        </nav>

        {/* Mobile: home icon + hamburger, both real 44px tap targets */}
        <div className="md:hidden flex items-center gap-1">
          <Link
            href="/"
            aria-label="Home"
            className="w-11 h-11 flex items-center justify-center text-ink/70"
          >
            <Home size={20} />
          </Link>
          <button
            className="w-11 h-11 flex items-center justify-center -mr-2"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={24} className="text-ink" /> : <Menu size={24} className="text-ink" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="md:hidden bg-canvas border-t border-stone-line px-5 py-4 flex flex-col gap-1">
          <Link
            href="/browse"
            className="py-3 text-base font-medium text-ink border-b border-stone-line"
            onClick={() => setOpen(false)}
          >
            Browse businesses
          </Link>
          <Link
            href="/business/signup"
            className="py-3 text-base font-medium text-ink border-b border-stone-line"
            onClick={() => setOpen(false)}
          >
            List your business
          </Link>
          <Link
            href="/business/login"
            className="mt-3 text-center py-3 rounded-lg bg-terra text-white font-medium"
            onClick={() => setOpen(false)}
          >
            Business login
          </Link>
        </nav>
      )}
    </header>
  );
}

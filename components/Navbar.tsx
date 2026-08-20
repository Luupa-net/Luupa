"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-canvas/95 backdrop-blur border-b border-stone-line">
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
            className="px-4 py-2 rounded-full bg-coral text-white font-semibold hover:bg-coral-dim transition-colors"
          >
            Business login
          </Link>
        </nav>

        {/* Mobile hamburger — real 44px tap target */}
        <button
          className="md:hidden w-11 h-11 flex items-center justify-center -mr-2"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} className="text-ink" /> : <Menu size={24} className="text-ink" />}
        </button>
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
            className="mt-3 text-center py-3 rounded-full bg-coral text-white font-semibold"
            onClick={() => setOpen(false)}
          >
            Business login
          </Link>
        </nav>
      )}
    </header>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Menu, X, Home, ChevronDown, LayoutDashboard, BadgeCheck, LogOut, Eye,
} from "lucide-react";

type BusinessSession = {
  name: string;
  logo_url: string | null;
  verified: boolean;
  status: "pending" | "active" | "suspended";
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [business, setBusiness] = useState<BusinessSession | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function loadBusiness() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setBusiness(null);
      setChecked(true);
      return;
    }
    const { data } = await supabase
      .from("businesses")
      .select("name, logo_url, verified, status")
      .eq("owner_id", session.user.id)
      .single();
    setBusiness(data ?? null);
    setChecked(true);
  }

  useEffect(() => {
    loadBusiness();
    // Keeps the navbar in sync the instant someone logs in or out, even though
    // this component itself doesn't remount when navigating between pages
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadBusiness());
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    setOpen(false);
    router.push("/");
  }

  const statusRing = business?.status === "active" ? "ring-emerald-400"
    : business?.status === "pending" ? "ring-terra"
    : "ring-red-400";

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

          {!checked ? null : business ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-stone-line hover:border-navy/30 transition-colors"
              >
                <span className={`relative w-7 h-7 rounded-full bg-navy/10 overflow-hidden flex items-center justify-center shrink-0 ring-2 ${statusRing}`}>
                  {business.logo_url ? (
                    <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-navy text-xs font-semibold">{business.name?.[0]?.toUpperCase()}</span>
                  )}
                  {business.verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-navy ring-2 ring-white flex items-center justify-center">
                      <BadgeCheck size={9} className="text-white" />
                    </span>
                  )}
                </span>
                <span className="text-ink font-medium max-w-[120px] truncate">{business.name}</span>
                <ChevronDown size={14} className={`text-stone transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-stone-line shadow-lg shadow-black/5 py-1.5 animate-[fadeUp_0.15s_ease-out]">
                  <div className="px-3.5 py-2.5 border-b border-stone-line">
                    <p className="text-sm font-medium text-ink truncate">{business.name}</p>
                    <p className="text-xs text-stone capitalize mt-0.5">{business.status}{business.verified ? " · Verified" : ""}</p>
                  </div>
                  <DropdownItem href="/business/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" onClick={() => setDropdownOpen(false)} />
                  {business.status === "active" && (
                    <DropdownItem href="/browse" icon={<Eye size={15} />} label="View live site" onClick={() => setDropdownOpen(false)} />
                  )}
                  {!business.verified && (
                    <DropdownItem href="/business/verify" icon={<BadgeCheck size={15} />} label="Get verified" onClick={() => setDropdownOpen(false)} />
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/business/signup" className="hover:text-ink transition-colors">List your business</Link>
              <Link
                href="/business/login"
                className="px-4 py-2 rounded-lg bg-terra text-white font-medium hover:bg-terra-dim transition-colors"
              >
                Business login
              </Link>
            </>
          )}

          <Link
            href="/"
            aria-label="Home"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink/60 hover:text-ink hover:bg-canvas2 transition-colors"
          >
            <Home size={18} />
          </Link>
        </nav>

        {/* Mobile: home icon + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <Link href="/" aria-label="Home" className="w-11 h-11 flex items-center justify-center text-ink/70">
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
          <Link href="/browse" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
            Browse businesses
          </Link>

          {business ? (
            <>
              <div className="flex items-center gap-2.5 py-3 border-b border-stone-line">
                <span className={`relative w-8 h-8 rounded-full bg-navy/10 overflow-hidden flex items-center justify-center shrink-0 ring-2 ${statusRing}`}>
                  {business.logo_url ? (
                    <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-navy text-xs font-semibold">{business.name?.[0]?.toUpperCase()}</span>
                  )}
                  {business.verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-navy ring-2 ring-white flex items-center justify-center">
                      <BadgeCheck size={9} className="text-white" />
                    </span>
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{business.name}</p>
                  <p className="text-xs text-stone capitalize">{business.status}{business.verified ? " · Verified" : ""}</p>
                </div>
              </div>
              <Link href="/business/dashboard" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              {!business.verified && (
                <Link href="/business/verify" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
                  Get verified
                </Link>
              )}
              <button onClick={handleLogout} className="py-3 text-base font-medium text-red-600 text-left">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/business/signup" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
                List your business
              </Link>
              <Link
                href="/business/login"
                className="mt-3 text-center py-3 rounded-lg bg-terra text-white font-medium"
                onClick={() => setOpen(false)}
              >
                Business login
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

function DropdownItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-canvas2 transition-colors">
      {icon} {label}
    </Link>
  );
}

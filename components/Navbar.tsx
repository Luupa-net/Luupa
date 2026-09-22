"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/lib/BusinessContext";
import { isEffectivelyVerified } from "@/lib/verification";
import {
  Menu, X, Home, ChevronDown, LayoutDashboard, BadgeCheck, LogOut, Eye,
  CalendarClock, User, UserCircle, CalendarCheck,
} from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { business, role, staffProfile, userId, checked } = useBusiness();
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // The business lookup itself now lives in BusinessContext, shared with every
  // business page — this only handles the two things specific to the navbar:
  // the pending-bookings badge, and (for non-business sessions) the
  // customer's display name.
  useEffect(() => {
    if (!checked) return;
    if (business) {
      setCustomerName(null);
      // Staff have no SELECT policy on the base `bookings` table (that's
      // deliberate — see migration-v23.sql) so this count has to go through
      // the same revenue-free view their pages use, or it always reads 0.
      const table = role === "staff" ? "bookings_operational" : "bookings";
      supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("status", "pending")
        .then(({ count }) => setPendingBookingsCount(count || 0));
    } else if (userId) {
      supabase
        .from("customers")
        .select("name")
        .eq("id", userId)
        .single()
        .then(({ data }) => setCustomerName(data?.name ?? null));
    } else {
      setCustomerName(null);
    }
  }, [business, role, userId, checked]);

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
    : business?.status === "pending" ? "ring-teal"
    : "ring-red-400";
  const verified = business ? isEffectivelyVerified(business) : false;

  return (
    <header className="sticky top-0 z-50 bg-canvas/95 border-b border-stone-line">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="font-display text-2xl font-semibold text-ink tracking-wide">
            luup<span className="text-teal">a</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink/80">
          <Link href="/browse" className="hover:text-ink transition-colors">Browse</Link>

          {!checked ? null : role === "owner" && business ? (
            <>
              <NavIconLink href="/business/bookings" icon={<CalendarClock size={18} />} count={pendingBookingsCount} label="Bookings" />
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
                  {verified && (
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
                    <p className="text-xs text-stone capitalize mt-0.5">{business.status}{verified ? " · Verified" : ""}</p>
                  </div>
                  <DropdownItem href="/business/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" onClick={() => setDropdownOpen(false)} />
                  {business.status === "active" && (
                    <DropdownItem href="/browse" icon={<Eye size={15} />} label="View live site" onClick={() => setDropdownOpen(false)} />
                  )}
                  {!verified && (
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
            </>
          ) : role === "staff" ? (
            // Deliberately narrow: no dashboard link, no verification, no
            // business switcher — staff have exactly one thing to do here.
            <>
              <NavIconLink href="/business/bookings" icon={<CalendarClock size={18} />} count={pendingBookingsCount} label="Bookings" />
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-stone-line hover:border-navy/30 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                    <span className="text-navy text-xs font-semibold">{staffProfile?.name?.[0]?.toUpperCase() || "S"}</span>
                  </span>
                  <span className="text-ink font-medium max-w-[120px] truncate">{staffProfile?.name}</span>
                  <ChevronDown size={14} className={`text-stone transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-stone-line shadow-lg shadow-black/5 py-1.5 animate-[fadeUp_0.15s_ease-out]">
                    <div className="px-3.5 py-2.5 border-b border-stone-line">
                      <p className="text-sm font-medium text-ink truncate">{staffProfile?.name}</p>
                      <p className="text-xs text-stone capitalize mt-0.5">{staffProfile?.role || "Staff"} · {business?.name}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {customerName ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full border border-stone-line hover:border-teal/30 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                      <User size={14} className="text-teal-dim" />
                    </span>
                    <span className="text-ink font-medium max-w-[120px] truncate">{customerName.split(" ")[0]}</span>
                    <ChevronDown size={14} className={`text-stone transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-stone-line shadow-lg shadow-black/5 py-1.5 animate-[fadeUp_0.15s_ease-out]">
                      <div className="px-3.5 py-2.5 border-b border-stone-line">
                        <p className="text-sm font-medium text-ink truncate">{customerName}</p>
                      </div>
                      <DropdownItem href="/account/profile" icon={<UserCircle size={15} />} label="My profile" onClick={() => setDropdownOpen(false)} />
                      <DropdownItem href="/account/profile?tab=bookings" icon={<CalendarCheck size={15} />} label="My bookings" onClick={() => setDropdownOpen(false)} />
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
                  <Link
                    href="/business/signup"
                    className="rounded-lg px-3 py-1.5 -mx-3 -my-1.5 text-ink/80 hover:text-ink hover:bg-canvas2 transition-colors"
                  >
                    List your business
                  </Link>
                  <Link
                    href="/account/login"
                    className="px-4 py-2 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors"
                  >
                    Log in
                  </Link>
                </>
              )}
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

          {role === "owner" && business ? (
            <>
              <div className="flex items-center gap-2.5 py-3 border-b border-stone-line">
                <span className={`relative w-8 h-8 rounded-full bg-navy/10 overflow-hidden flex items-center justify-center shrink-0 ring-2 ${statusRing}`}>
                  {business.logo_url ? (
                    <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-navy text-xs font-semibold">{business.name?.[0]?.toUpperCase()}</span>
                  )}
                  {verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-navy ring-2 ring-white flex items-center justify-center">
                      <BadgeCheck size={9} className="text-white" />
                    </span>
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{business.name}</p>
                  <p className="text-xs text-stone capitalize">{business.status}{verified ? " · Verified" : ""}</p>
                </div>
              </div>
              <Link href="/business/bookings" className="py-3 text-base font-medium text-ink border-b border-stone-line flex items-center justify-between" onClick={() => setOpen(false)}>
                Bookings {pendingBookingsCount > 0 && <span className="text-xs font-bold bg-teal text-white px-2 py-0.5 rounded-full">{pendingBookingsCount > 9 ? "9+" : pendingBookingsCount}</span>}
              </Link>
              <Link href="/business/dashboard" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              {!verified && (
                <Link href="/business/verify" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
                  Get verified
                </Link>
              )}
              <button onClick={handleLogout} className="py-3 text-base font-medium text-red-600 text-left">
                Log out
              </button>
            </>
          ) : role === "staff" ? (
            <>
              <div className="flex items-center gap-2.5 py-3 border-b border-stone-line">
                <span className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                  <span className="text-navy text-xs font-semibold">{staffProfile?.name?.[0]?.toUpperCase() || "S"}</span>
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{staffProfile?.name}</p>
                  <p className="text-xs text-stone capitalize">{staffProfile?.role || "Staff"} · {business?.name}</p>
                </div>
              </div>
              <Link href="/business/bookings" className="py-3 text-base font-medium text-ink border-b border-stone-line flex items-center justify-between" onClick={() => setOpen(false)}>
                Bookings {pendingBookingsCount > 0 && <span className="text-xs font-bold bg-teal text-white px-2 py-0.5 rounded-full">{pendingBookingsCount > 9 ? "9+" : pendingBookingsCount}</span>}
              </Link>
              <button onClick={handleLogout} className="py-3 text-base font-medium text-red-600 text-left">
                Log out
              </button>
            </>
          ) : customerName ? (
            <>
              <div className="flex items-center gap-2 py-3 border-b border-stone-line">
                <span className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                  <User size={16} className="text-teal-dim" />
                </span>
                <span className="text-base font-medium text-ink truncate">{customerName}</span>
              </div>
              <Link href="/account/profile" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
                My profile
              </Link>
              <Link href="/account/profile?tab=bookings" className="py-3 text-base font-medium text-ink border-b border-stone-line" onClick={() => setOpen(false)}>
                My bookings
              </Link>
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
                href="/account/login"
                className="mt-3 text-center py-3 rounded-lg bg-teal text-white font-medium"
                onClick={() => setOpen(false)}
              >
                Log in
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

function NavIconLink({ href, icon, count, label }: { href: string; icon: React.ReactNode; count: number; label: string }) {
  return (
    <Link href={href} aria-label={label} className="relative w-9 h-9 rounded-lg flex items-center justify-center text-ink/60 hover:text-ink hover:bg-canvas2 transition-colors">
      {icon}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-teal text-white text-[10px] font-bold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function DropdownItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink hover:bg-canvas2 transition-colors">
      {icon} {label}
    </Link>
  );
}

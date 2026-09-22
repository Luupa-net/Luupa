"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { ArrowLeft, Search, X, SlidersHorizontal } from "lucide-react";

type Customer = {
  phone: string;
  name: string;
  email: string | null;
  bookingCount: number;
  lastVisit: string; // ISO
  lifetimeValue: number;
  tag: string | null;
};

// A handful of the app's existing token colors, picked deterministically per
// tag string — free-text tags can't map to a fixed palette, but reusing only
// colors already in the design system keeps pills consistent with the rest
// of the UI instead of inventing new hues.
const TAG_PILL_PALETTE = [
  "bg-teal/10 text-teal-dim",
  "bg-navy/10 text-navy",
  "bg-skyblue/10 text-skyblue-dim",
];

function tagPillClass(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return TAG_PILL_PALETTE[Math.abs(hash) % TAG_PILL_PALETTE.length];
}

function visitDate(b: any): Date {
  return new Date(b.preferred_date || b.created_at);
}

function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best: string | null = null;
  let bestCount = 0;
  // Map iteration uses forEach rather than for-of: this project targets ES5
  // without downlevelIteration, so for-of over a Map fails to compile.
  counts.forEach((c, v) => {
    if (c > bestCount) { best = v; bestCount = c; }
  });
  return best;
}

// Groups every booking by normalized phone so walk-ins (customer_id null,
// identified only by name/phone text) and account-linked customers alike
// collapse into a single row per real person.
function buildCustomers(bookings: any[], notes: any[]): Customer[] {
  const groups = new Map<string, any[]>();
  bookings.forEach((b) => {
    if (!b.customer_contact) return;
    const key = normalizeWhatsAppNumber(b.customer_contact);
    const arr = groups.get(key);
    if (arr) arr.push(b); else groups.set(key, [b]);
  });

  const result: Customer[] = [];
  groups.forEach((group, phone) => {
    const sorted = [...group].sort((a, b) => visitDate(b).getTime() - visitDate(a).getTime());
    const mostRecent = sorted[0];
    const email = sorted.find((b) => b.customer_email)?.customer_email ?? null;
    // Fallback lifetime value: sums bookings.amount where paid, since that's
    // the only ledger that exists for older bookings today. Once
    // booking_payments has real entries for a customer, a future pass could
    // prefer summing that table's rows instead of this column snapshot.
    const lifetimeValue = group
      .filter((b) => b.paid)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    // Prefer matching the note row by customer_id (real linked accounts),
    // fall back to phone — manual/walk-in bookings never carry a customer_id.
    const customerId = group.find((b) => b.customer_id)?.customer_id || null;
    const noteRow =
      (customerId && notes.find((n) => n.customer_id === customerId)) ||
      notes.find((n) => n.customer_phone === phone) ||
      null;

    result.push({
      phone,
      name: mostRecent.customer_name || "Unknown",
      email,
      bookingCount: group.length,
      lastVisit: visitDate(mostRecent).toISOString(),
      lifetimeValue,
      tag: noteRow?.tag || null,
    });
  });
  return result.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}

export default function CustomersPage() {
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/account/login");
        return;
      }
      const { data: biz } = await supabase.from("businesses").select("id, name").eq("owner_id", user.id).single();
      if (biz) {
        setBusiness(biz);
        const [{ data: bks }, { data: notesRows }] = await Promise.all([
          supabase.from("bookings").select("*").eq("business_id", biz.id),
          supabase.from("customer_notes").select("*").eq("business_id", biz.id),
        ]);
        setBookings(bks || []);
        setNotes(notesRows || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const customers = useMemo(() => buildCustomers(bookings, notes), [bookings, notes]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => { if (n.tag) set.add(n.tag); });
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (tagFilter !== "all" && c.tag !== tagFilter) return false;
      if (!q) return true;
      return [c.name, c.phone, c.email].some((f) => (f || "").toLowerCase().includes(q));
    });
  }, [customers, search, tagFilter]);

  const hasActiveFilters = search.trim() !== "" || tagFilter !== "all";

  if (loading) {
    return (
      <div className="bg-canvas2 min-h-screen">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="h-6 w-40 bg-stone-line/60 rounded animate-pulse mb-6" />
          <div className="h-9 w-56 bg-stone-line/60 rounded animate-pulse mb-6" />
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white border border-stone-line rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!business) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Customers</h1>
          <p className="text-sm text-stone">{customers.length} total</p>
        </div>

        {/* Toolbar — search + tag filter, mirrors the bookings page pattern */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              className="input pl-9 pr-8 bg-white"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone hover:text-ink">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="input pl-8 pr-7 bg-white appearance-none w-auto"
            >
              <option value="all">All tags</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <SlidersHorizontal size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone pointer-events-none" />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setTagFilter("all"); }}
              className="text-xs font-medium text-stone hover:text-ink px-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-stone-line shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-stone text-center py-16">
              {customers.length === 0
                ? "No customers yet — they'll show up here once bookings come in."
                : "No customers match your filters."}
            </p>
          ) : (
            <div className="divide-y divide-stone-line">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-stone uppercase tracking-wide">
                <span className="w-9" />
                <span className="flex-1 min-w-0">Customer</span>
                <span className="w-28 text-right shrink-0">Bookings</span>
                <span className="w-32 text-right shrink-0">Last visit</span>
                <span className="w-28 text-right shrink-0">Lifetime value</span>
              </div>
              {filtered.map((c) => (
                <Link
                  key={c.phone}
                  href={`/business/customers/${c.phone}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-canvas2 transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-navy/10 text-navy font-semibold text-xs flex items-center justify-center shrink-0">
                    {c.name?.[0]?.toUpperCase() || "?"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink text-sm truncate">{c.name}</span>
                      {c.tag && (
                        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${tagPillClass(c.tag)}`}>
                          {c.tag}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-stone mt-0.5 truncate">
                      +{c.phone}{c.email ? ` · ${c.email}` : ""}
                    </span>
                  </span>
                  <span className="w-28 text-right shrink-0 text-sm text-ink">
                    {c.bookingCount} <span className="hidden sm:inline text-stone">booking{c.bookingCount === 1 ? "" : "s"}</span>
                  </span>
                  <span className="hidden sm:block w-32 text-right shrink-0 text-xs text-stone">
                    {new Date(c.lastVisit).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="hidden sm:block w-28 text-right shrink-0 text-sm font-medium text-ink">
                    BHD {c.lifetimeValue.toFixed(c.lifetimeValue % 1 === 0 ? 0 : 2)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

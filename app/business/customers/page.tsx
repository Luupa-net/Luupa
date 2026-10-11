"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBusinessGuard } from "@/lib/useBusinessGuard";
import Link from "next/link";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { formatBhd } from "@/lib/money";
import { downloadCsv, phoneCell } from "@/lib/csv";
import { toKey } from "@/lib/calendarGrid";
import BusinessLoadError from "@/components/BusinessLoadError";
import NotBusinessAccount from "@/components/NotBusinessAccount";
import { ArrowLeft, Search, X, SlidersHorizontal, AlertCircle, Download, Users, Repeat, Wallet } from "lucide-react";

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
  return b.preferred_date ? new Date(`${b.preferred_date}T00:00:00`) : new Date(b.created_at);
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
    // A bare country code is "no number", not one shared customer.
    if (phone.length < 8) return;
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
  // Customer lifetime-value figures are revenue-derived — owner/manager only.
  const { business, state: guardState, refresh } = useBusinessGuard({ ownerOnly: true });
  const [bookings, setBookings] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sort, setSort] = useState<"recent" | "value" | "visits">("recent");

  useEffect(() => {
    if (guardState !== "ready") {
      if (guardState !== "checking") setLoading(false);
      return;
    }
    async function load() {
      const [bookingsRes, notesRes] = await Promise.all([
        supabase.from("bookings").select("*").eq("business_id", business.id),
        supabase.from("customer_notes").select("*").eq("business_id", business.id),
      ]);
      setLoadError(!!(bookingsRes.error || notesRes.error));
      setBookings(bookingsRes.data || []);
      setNotes(notesRes.data || []);
      setLoading(false);
    }
    load();
    // Keyed on business?.id, not the business object itself, so a content-only
    // update to the shared context doesn't retrigger this effect for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardState, business?.id]);

  const customers = useMemo(() => buildCustomers(bookings, notes), [bookings, notes]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => { if (n.tag) set.add(n.tag); });
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = customers.filter((c) => {
      if (tagFilter !== "all" && c.tag !== tagFilter) return false;
      if (!q) return true;
      return [c.name, c.phone, c.email].some((f) => (f || "").toLowerCase().includes(q));
    });
    if (sort === "value") return [...list].sort((a, b) => b.lifetimeValue - a.lifetimeValue);
    if (sort === "visits") return [...list].sort((a, b) => b.bookingCount - a.bookingCount);
    return list;
  }, [customers, search, tagFilter, sort]);

  const hasActiveFilters = search.trim() !== "" || tagFilter !== "all";
  const repeatCount = customers.filter((c) => c.bookingCount > 1).length;
  const totalValue = customers.reduce((s, c) => s + c.lifetimeValue, 0);

  function exportCsv() {
    downloadCsv(
      `luupa-customers-${toKey(new Date())}.csv`,
      ["Name", "Phone", "Email", "Bookings", "Last visit", "Lifetime value (BHD)", "Tag"],
      filtered.map((c) => [c.name, phoneCell(c.phone), c.email || "", c.bookingCount, toKey(new Date(c.lastVisit)), c.lifetimeValue.toFixed(3), c.tag || ""])
    );
  }

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
  if (guardState === "error") return <BusinessLoadError onRetry={refresh} />;
  if (guardState === "not_business") return <NotBusinessAccount />;
  if (!business || guardState !== "ready") return null;

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Customers</h1>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 h-9 rounded-lg bg-white border border-stone-line text-ink/80 hover:text-ink hover:border-navy/30 transition-colors disabled:opacity-50"
          >
            <Download size={13} /> Export
          </button>
        </div>

        {loadError && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle size={15} className="text-red-600 shrink-0" />
            <p className="text-sm text-red-700">Couldn't load your customers — try refreshing the page.</p>
          </div>
        )}

        <div className="flex sm:grid sm:grid-cols-3 gap-3 mt-6 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible">
          <MiniStat icon={<Users size={14} />} label="Customers" value={customers.length} />
          <MiniStat icon={<Repeat size={14} />} label="Came back more than once" value={customers.length ? `${repeatCount} · ${Math.round((repeatCount / customers.length) * 100)}%` : "0"} />
          <MiniStat icon={<Wallet size={14} />} label="Lifetime revenue" value={formatBhd(totalValue)} />
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
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Sort customers"
            className="input bg-white appearance-none w-auto pr-7"
          >
            <option value="recent">Most recent</option>
            <option value="value">Highest value</option>
            <option value="visits">Most visits</option>
          </select>
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
                    {formatBhd(c.lifetimeValue)}
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

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="shrink-0 w-[170px] sm:w-auto rounded-xl bg-white border border-stone-line px-4 py-3.5">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md mb-1.5 text-navy bg-navy/10">{icon}</span>
      <p className="font-display text-xl font-semibold text-ink leading-tight truncate">{value}</p>
      <p className="text-xs text-stone mt-0.5">{label}</p>
    </div>
  );
}

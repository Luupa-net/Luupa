"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { periodComparison, getPeriodBounds } from "@/lib/bookingPeriods";
import { getMonthGrid, getWeekDays, addDays, addMonths, toKey, isSameDay, WEEKDAY_LABELS } from "@/lib/calendarGrid";
import ManualBookingForm from "@/components/ManualBookingForm";
import BookingDrawer from "@/components/BookingDrawer";
import { useRealtimeBookings } from "@/lib/useRealtimeBookings";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Plus, TrendingUp, TrendingDown, Minus,
  Search, X, CalendarDays, LayoutGrid, ListChecks, MousePointerClick, SlidersHorizontal,
  Clock3, Wallet,
} from "lucide-react";

type View = "month" | "week" | "day" | "list";

const STATUS_FILTERS = [
  { key: "all", label: "All statuses" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "In service" },
  { key: "completed", label: "Completed" },
  { key: "declined", label: "Declined" },
  { key: "no_show", label: "No-show" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default function BookingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/business/login");
        return;
      }
      const { data: biz } = await supabase.from("businesses").select("id, name, payment_qr_url").eq("owner_id", user.id).single();
      if (biz) {
        setBusiness(biz);
        const { data: bks } = await supabase
          .from("bookings")
          .select("*")
          .eq("business_id", biz.id)
          .order("created_at", { ascending: false });
        setBookings(bks || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // Live updates from Realtime: another tab/device changing a booking (or a
  // customer's own action on their side) shows up here without a refresh.
  // `ManualBookingForm` already does its own optimistic prepend on submit —
  // this tab is also subscribed to its own writes, so the same INSERT will
  // arrive again here moments later; guard against double-inserting it.
  useRealtimeBookings("business_id", business?.id, ({ eventType, new: newRow, old: oldRow }) => {
    if (eventType === "INSERT") {
      setBookings((prev) => (prev.some((b) => b.id === newRow.id) ? prev : [newRow, ...prev]));
    } else if (eventType === "UPDATE") {
      setBookings((prev) => prev.map((b) => (b.id === newRow.id ? newRow : b)));
      setSelected((prev: any) => (prev?.id === newRow.id ? newRow : prev));
    } else if (eventType === "DELETE") {
      setBookings((prev) => prev.filter((b) => b.id !== oldRow.id));
      setSelected((prev: any) => (prev?.id === oldRow.id ? null : prev));
    }
  });

  async function updateBooking(id: string, changes: Record<string, any>) {
    const previous = bookings.find((b) => b.id === id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, ...changes }));
    // Supabase's query builder is lazy — it only actually sends the request once
    // awaited/then()'d. Leaving this un-awaited (as it was before) meant the
    // network call never fired at all: every status change, invoice amount, and
    // edit here looked saved in the UI but was silently lost on refresh.
    const { error } = await supabase.from("bookings").update(changes).eq("id", id);
    if (error && previous) {
      setBookings((prev) => prev.map((b) => (b.id === id ? previous : b)));
      if (selected?.id === id) setSelected(previous);
      setUpdateError("Couldn't save that change — please try again.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.customer_name, b.service, b.vehicle_plate, b.vehicle_make, b.vehicle_model, b.customer_contact]
        .some((f) => (f || "").toString().toLowerCase().includes(q));
    });
  }, [bookings, search, statusFilter]);

  function bookingsOn(date: Date) {
    const key = toKey(date);
    return filtered.filter((b) => (b.preferred_date || toKey(new Date(b.created_at))) === key);
  }

  function jumpTo(v: View) {
    setAnchor(new Date());
    setView(v);
  }

  function navigate(dir: 1 | -1) {
    if (view === "month") setAnchor((a) => addMonths(a, dir));
    else if (view === "week") setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => addDays(a, dir));
  }

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  if (loading) {
    return (
      <div className="bg-canvas2 min-h-screen">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="h-6 w-40 bg-stone-line/60 rounded animate-pulse mb-6" />
          <div className="h-9 w-56 bg-stone-line/60 rounded animate-pulse mb-6" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 w-40 shrink-0 bg-white border border-stone-line rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-[420px] mt-6 bg-white border border-stone-line rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }
  if (!business) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  const today = periodComparison(bookings, "day");
  const week = periodComparison(bookings, "week");
  const month = periodComparison(bookings, "month");
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const monthBounds = getPeriodBounds("month", 0);
  const revenueThisMonth = bookings
    .filter((b) => b.paid && b.amount != null && new Date(b.created_at) >= monthBounds.start && new Date(b.created_at) < monthBounds.end)
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Bookings</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-teal text-white shadow-sm hover:bg-teal-dim hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150"
          >
            <Plus size={15} /> Add booking
          </button>
        </div>

        {updateError && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{updateError}</p>
            <button onClick={() => setUpdateError(null)} aria-label="Dismiss" className="text-red-600 hover:text-red-800 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Analytics — a horizontally scrollable row on phones, a full grid
            from tablet up. Clickable, jumps the calendar to that view. */}
        <div className="flex sm:grid sm:grid-cols-5 gap-3 mt-6 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible">
          <AnalyticsCard label="Today" data={today} onClick={() => jumpTo("day")} />
          <AnalyticsCard label="This week" data={week} compareLabel="vs last week" onClick={() => jumpTo("week")} />
          <AnalyticsCard label="This month" data={month} compareLabel="vs last month" onClick={() => jumpTo("month")} />
          <SimpleStatCard icon={<Clock3 size={14} />} label="Pending" value={pendingCount} tint={pendingCount > 0 ? "teal" : "stone"} onClick={() => setStatusFilter("pending")} />
          <SimpleStatCard icon={<Wallet size={14} />} label="Revenue (mo.)" value={`BHD ${revenueThisMonth.toFixed(revenueThisMonth % 1 === 0 ? 0 : 2)}`} tint="navy" />
        </div>

        {/* Toolbar — search, status filter, view switch, all in one row that
            wraps cleanly on mobile instead of squeezing everything to fit. */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, service, plate…"
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input pl-8 pr-7 bg-white appearance-none w-auto"
            >
              {STATUS_FILTERS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <SlidersHorizontal size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone pointer-events-none" />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-xs font-medium text-stone hover:text-ink px-2"
            >
              Clear filters
            </button>
          )}
          <div className="flex items-center gap-1 bg-white border border-stone-line rounded-lg p-1 ml-auto">
            <ViewToggleBtn active={view === "month"} onClick={() => setView("month")} icon={<LayoutGrid size={13} />} label="Month" />
            <ViewToggleBtn active={view === "week"} onClick={() => setView("week")} icon={<CalendarDays size={13} />} label="Week" />
            <ViewToggleBtn active={view === "day"} onClick={() => setView("day")} icon={<MousePointerClick size={13} />} label="Day" />
            <ViewToggleBtn active={view === "list"} onClick={() => setView("list")} icon={<ListChecks size={13} />} label="List" />
          </div>
        </div>

        {/* Calendar + booking detail — the panel opens beside the calendar on
            desktop (a real split view, always reserved so nothing jumps
            around when you select something), and as a bottom sheet on
            mobile where there's no room for two columns. */}
        <div className="mt-6 lg:flex lg:items-start lg:gap-6">
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-stone-line shadow-sm overflow-hidden">
          {view !== "list" && (
            <div className="flex items-center justify-between flex-wrap gap-2 p-4 border-b border-stone-line relative">
              <button
                onClick={() => setShowDatePicker((s) => !s)}
                className="flex items-center gap-1.5 font-display text-lg font-semibold text-ink hover:text-navy transition-colors"
              >
                {view === "month" && anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                {view === "week" && `Week of ${getWeekDays(anchor)[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                {view === "day" && anchor.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                <ChevronDown size={15} className="text-stone" />
              </button>

              {showDatePicker && (
                <div className="absolute top-full left-4 mt-1 bg-white rounded-xl border border-stone-line shadow-lg p-3 flex gap-2 z-20">
                  <select
                    value={anchor.getMonth()}
                    onChange={(e) => setAnchor(new Date(anchor.getFullYear(), Number(e.target.value), anchor.getDate()))}
                    className="input text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" })}</option>
                    ))}
                  </select>
                  {view === "day" && (
                    <select
                      value={anchor.getDate()}
                      onChange={(e) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth(), Number(e.target.value)))}
                      className="input text-sm"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={anchor.getFullYear()}
                    onChange={(e) => setAnchor(new Date(Number(e.target.value), anchor.getMonth(), anchor.getDate()))}
                    className="input text-sm"
                  >
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="text-sm font-medium px-3 py-2 rounded-lg bg-navy text-white"
                  >
                    Go
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-md hover:bg-canvas2 flex items-center justify-center transition-colors"><ChevronLeft size={15} /></button>
                  <button onClick={() => setAnchor(new Date())} className="text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-canvas2 transition-colors">Today</button>
                  <button onClick={() => navigate(1)} className="w-7 h-7 rounded-md hover:bg-canvas2 flex items-center justify-center transition-colors"><ChevronRight size={15} /></button>
                </div>
              </div>
            </div>
          )}

          {view === "month" && (
            <MonthGrid anchor={anchor} bookingsOn={bookingsOn} onSelectDay={(d) => { setAnchor(d); setView("day"); }} />
          )}
          {view === "week" && (
            <WeekGrid anchor={anchor} bookingsOn={bookingsOn} onSelectBooking={setSelected} onSelectDay={(d) => { setAnchor(d); setView("day"); }} />
          )}
          {view === "day" && (
            <DayList anchor={anchor} bookingsOn={bookingsOn} onSelectBooking={setSelected} />
          )}
          {view === "list" && (
            <AgendaList bookings={filtered} selectedId={selected?.id} onSelectBooking={setSelected} />
          )}
        </div>

        {/* Reserved-width spacer so the calendar column doesn't reflow when
            the drawer opens/closes — the drawer itself renders separately
            below since it's fixed-positioned on desktop, not part of this
            column's box. */}
        <div className="mt-6 lg:mt-0 lg:w-[460px] lg:shrink-0">
          {!selected && (
            <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:h-[calc(100vh-260px)] lg:min-h-[360px] rounded-2xl border border-dashed border-stone-line bg-white/60 text-center px-8">
              <div className="w-14 h-14 rounded-full bg-navy/5 flex items-center justify-center mb-4">
                <MousePointerClick size={22} className="text-navy/50" />
              </div>
              <p className="text-sm font-medium text-ink">Select a booking</p>
              <p className="text-xs text-stone mt-1.5 leading-relaxed">
                Pick anything from the calendar or list to see full details, move its status forward, and send an invoice.
              </p>
            </div>
          )}
        </div>
        </div>
      </div>

      {selected && (
        <BookingDrawer
          booking={selected}
          business={business}
          businessName={business.name}
          paymentQrUrl={business.payment_qr_url}
          onUpdate={updateBooking}
          onClose={() => setSelected(null)}
        />
      )}

      {showAddForm && (
        <ManualBookingForm
          businessId={business.id}
          onAdded={(b) => setBookings((prev) => [b, ...prev])}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

function ViewToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
        active ? "bg-navy text-white" : "text-ink/70 hover:bg-canvas2"
      }`}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function AnalyticsCard({ label, data, compareLabel, onClick }: { label: string; data: { current: number; diff: number }; compareLabel?: string; onClick: () => void }) {
  const TrendIcon = data.diff > 0 ? TrendingUp : data.diff < 0 ? TrendingDown : Minus;
  const trendColor = data.diff > 0 ? "text-emerald-600" : data.diff < 0 ? "text-red-500" : "text-stone";
  return (
    <button onClick={onClick} className="text-left shrink-0 w-[150px] sm:w-auto rounded-xl bg-white border border-stone-line px-4 py-3.5 hover:border-navy/30 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150">
      <p className="text-xs text-stone">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink mt-1">{data.current}</p>
      {compareLabel && (
        <p className={`flex items-center gap-1 text-xs mt-1 ${trendColor}`}>
          <TrendIcon size={12} />
          {data.diff > 0 ? "+" : ""}{data.diff} {compareLabel}
        </p>
      )}
    </button>
  );
}

function SimpleStatCard({ icon, label, value, tint, onClick }: { icon: React.ReactNode; label: string; value: string | number; tint: "navy" | "teal" | "stone"; onClick?: () => void }) {
  const tints = { navy: "text-navy bg-navy/10", teal: "text-teal-dim bg-teal/10", stone: "text-stone bg-stone-line" }[tint];
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`text-left shrink-0 w-[150px] sm:w-auto rounded-xl bg-white border border-stone-line px-4 py-3.5 transition-all duration-150 ${
        onClick ? "hover:border-navy/30 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]" : ""
      }`}
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md mb-1.5 ${tints}`}>{icon}</span>
      <p className="font-display text-2xl font-semibold text-ink leading-tight">{value}</p>
      <p className="text-xs text-stone mt-0.5">{label}</p>
    </Comp>
  );
}

function MonthGrid({ anchor, bookingsOn, onSelectDay }: { anchor: Date; bookingsOn: (d: Date) => any[]; onSelectDay: (d: Date) => void }) {
  const weeks = getMonthGrid(anchor);
  const today = new Date();
  return (
    <div>
      <div className="grid grid-cols-7 text-xs text-stone font-medium px-2 pt-3">
        {WEEKDAY_LABELS.map((d) => <div key={d} className="text-center py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day, i) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayBookings = bookingsOn(day);
          return (
            <button
              key={i}
              onClick={() => onSelectDay(day)}
              className={`aspect-square sm:aspect-[4/3] border-t border-l border-stone-line p-1.5 text-left hover:bg-canvas2 transition-colors ${
                i % 7 === 6 ? "border-r" : ""
              } ${!inMonth ? "text-stone-dim bg-canvas2/40" : "text-ink"}`}
            >
              <span className={`text-xs ${isSameDay(day, today) ? "bg-teal text-white rounded-full w-5 h-5 inline-flex items-center justify-center" : ""}`}>
                {day.getDate()}
              </span>
              {dayBookings.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayBookings.slice(0, 3).map((b) => (
                    <span key={b.id} className={`w-1.5 h-1.5 rounded-full ${b.status === "pending" ? "bg-teal" : "bg-navy"}`} />
                  ))}
                  {dayBookings.length > 3 && <span className="text-[9px] text-stone">+{dayBookings.length - 3}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ anchor, bookingsOn, onSelectBooking, onSelectDay }: { anchor: Date; bookingsOn: (d: Date) => any[]; onSelectBooking: (b: any) => void; onSelectDay: (d: Date) => void }) {
  const days = getWeekDays(anchor);
  const today = new Date();
  return (
    <div className="grid grid-cols-7 divide-x divide-stone-line">
      {days.map((day) => {
        const dayBookings = bookingsOn(day);
        return (
          <div key={toKey(day)} className="min-h-[280px]">
            <button
              onClick={() => onSelectDay(day)}
              className="w-full text-center py-2 border-b border-stone-line hover:bg-canvas2 transition-colors"
            >
              <p className="text-[10px] text-stone uppercase">{day.toLocaleDateString(undefined, { weekday: "short" })}</p>
              <p className={`text-sm font-medium ${isSameDay(day, today) ? "text-teal" : "text-ink"}`}>{day.getDate()}</p>
            </button>
            <div className="p-1.5 space-y-1">
              {dayBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className={`w-full text-left text-[10px] rounded px-1.5 py-1 truncate transition-transform hover:scale-[1.03] ${b.status === "pending" ? "bg-teal/15 text-teal-dim" : "bg-navy/10 text-navy"}`}
                >
                  {b.preferred_time && <span className="font-medium">{b.preferred_time} </span>}
                  {b.customer_name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({ anchor, bookingsOn, onSelectBooking }: { anchor: Date; bookingsOn: (d: Date) => any[]; onSelectBooking: (b: any) => void }) {
  const dayBookings = bookingsOn(anchor);
  return (
    <div className="p-4 space-y-2.5">
      {dayBookings.length === 0 && (
        <p className="text-sm text-stone text-center py-10">Nothing booked this day.</p>
      )}
      {dayBookings.map((b) => (
        <button
          key={b.id}
          onClick={() => onSelectBooking(b)}
          className={`w-full text-left rounded-lg border p-3.5 hover:border-navy/30 hover:shadow-sm transition-all ${
            b.status === "pending" ? "border-teal/30 bg-teal/5" : "border-stone-line bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-ink text-sm">{b.customer_name}</span>
            <StatusChip status={b.status} />
          </div>
          <p className="text-xs text-stone mt-0.5">
            {b.preferred_time && `${b.preferred_time} · `}{b.service || "No service specified"}
          </p>
        </button>
      ))}
    </div>
  );
}

// Flat, chronological view of every filtered booking — the fastest way to
// scan "what's coming up" on a small phone screen without navigating a grid.
function AgendaList({ bookings, selectedId, onSelectBooking }: { bookings: any[]; selectedId?: string; onSelectBooking: (b: any) => void }) {
  const sorted = [...bookings].sort((a, b) => {
    const aKey = `${a.preferred_date || toKey(new Date(a.created_at))} ${a.preferred_time || ""}`;
    const bKey = `${b.preferred_date || toKey(new Date(b.created_at))} ${b.preferred_time || ""}`;
    return bKey.localeCompare(aKey);
  });

  const groups: { label: string; items: any[] }[] = [];
  const today = toKey(new Date());
  const tomorrow = toKey(addDays(new Date(), 1));
  for (const b of sorted) {
    const key = b.preferred_date || toKey(new Date(b.created_at));
    const label = key === today ? "Today" : key === tomorrow ? "Tomorrow" : new Date(key).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(b);
    else groups.push({ label, items: [b] });
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-stone text-center py-16">No bookings match your filters.</p>;
  }

  return (
    <div className="divide-y divide-stone-line">
      {groups.map((g) => (
        <div key={g.label} className="p-4">
          <p className="text-xs uppercase tracking-wide text-stone font-semibold mb-2.5">{g.label}</p>
          <div className="space-y-2">
            {g.items.map((b) => (
              <button
                key={b.id}
                onClick={() => onSelectBooking(b)}
                className={`w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-navy/30 hover:shadow-sm ${
                  selectedId === b.id ? "border-navy bg-navy/[0.03]" : "border-stone-line bg-white"
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-navy/10 text-navy font-semibold text-xs flex items-center justify-center shrink-0">
                  {b.customer_name?.[0]?.toUpperCase() || "?"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink text-sm truncate">{b.customer_name}</span>
                    <StatusChip status={b.status} />
                  </span>
                  <span className="block text-xs text-stone mt-0.5 truncate">
                    {b.preferred_time && `${b.preferred_time} · `}{b.service || "No service specified"}
                    {b.amount != null && ` · BHD ${b.amount}`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tones: Record<string, string> = {
    pending: "bg-teal/10 text-teal-dim",
    confirmed: "bg-navy/10 text-navy",
    arrived: "bg-skyblue/10 text-skyblue-dim",
    in_progress: "bg-skyblue/10 text-skyblue-dim",
    completed: "bg-emerald-100 text-emerald-700",
    declined: "bg-stone-line text-stone",
    no_show: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-50 text-red-600",
  };
  return (
    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${tones[status] || "bg-stone-line text-stone"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

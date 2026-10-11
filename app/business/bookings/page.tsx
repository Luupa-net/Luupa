"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBusinessGuard } from "@/lib/useBusinessGuard";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { periodComparison, revenueInPeriod } from "@/lib/bookingPeriods";
import { getMonthGrid, getWeekDays, addDays, addMonths, toKey, isSameDay, WEEKDAY_LABELS } from "@/lib/calendarGrid";
import ManualBookingForm from "@/components/ManualBookingForm";
import dynamic from "next/dynamic";
import BusinessLoadError from "@/components/BusinessLoadError";
import NotBusinessAccount from "@/components/NotBusinessAccount";
import { useRealtimeBookings } from "@/lib/useRealtimeBookings";
import { useBookingAlerts, formatWhen } from "@/lib/BookingAlertsContext";
import { notifyCustomerOfStatus } from "@/lib/notifyCustomer";
import { formatBhd, PAYMENT_METHOD_LABEL, receiptNumber } from "@/lib/money";
import { downloadCsv, phoneCell } from "@/lib/csv";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Plus, TrendingUp, TrendingDown, Minus,
  Search, X, CalendarDays, LayoutGrid, ListChecks, MousePointerClick, SlidersHorizontal,
  Clock3, Wallet, AlertCircle, Check, Loader2, BellRing, Download,
} from "lucide-react";

// The drawer (details/checkout/history/notes) is the heaviest part of this
// page and only matters once a booking is opened — split into its own chunk
// and warmed up in the background right after the board renders, so the
// first open is still instant.
const loadDrawer = () => import("@/components/BookingDrawer");
const BookingDrawer = dynamic(loadDrawer, { ssr: false });

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
  return (
    <Suspense>
      <BookingsBoard />
    </Suspense>
  );
}

function BookingsBoard() {
  const { business, role, state: guardState, refresh } = useBusinessGuard();
  const isStaff = role === "staff";
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoadError, setBookingsLoadError] = useState(false);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updateError, setUpdateError] = useState<string | null>(null);
  // Bookings that arrived while this page was open — glow until opened.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const alerts = useBookingAlerts();

  useEffect(() => {
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    idle(() => { loadDrawer(); });
  }, []);

  useEffect(() => {
    if (guardState !== "ready") {
      if (guardState !== "checking") setLoading(false);
      return;
    }
    async function load() {
      // Staff have no SELECT policy on the base `bookings` table — amount/
      // discount/payment_method are owner-only, even via a direct REST call,
      // not just hidden in this UI (see migration-v23.sql). They read through
      // bookings_operational instead, which leaves those columns out entirely.
      const { data: bks, error } = await supabase
        .from(isStaff ? "bookings_operational" : "bookings")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });
      setBookingsLoadError(!!error);
      setBookings(bks || []);
      setLoading(false);
    }
    load();
    // Keyed on business?.id, not the business object itself, so a content-only
    // update (e.g. the dashboard patching a saved field into the shared
    // context) doesn't retrigger this effect and refetch bookings for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardState, business?.id, isStaff]);

  // Live updates from Realtime: another tab/device changing a booking (or a
  // customer's own action on their side) shows up here without a refresh.
  // `ManualBookingForm` already does its own optimistic prepend on submit —
  // this tab is also subscribed to its own writes, so the same INSERT will
  // arrive again here moments later; guard against double-inserting it.
  // Skipped entirely for staff: Realtime's postgres_changes stream is RLS-gated
  // on the base `bookings` table, and staff have no SELECT policy there, so it
  // would never deliver anything anyway — passing undefined makes the hook a
  // no-op instead of holding open a channel that never fires.
  useRealtimeBookings("business_id", isStaff ? undefined : business?.id, ({ eventType, new: newRow, old: oldRow }) => {
    if (eventType === "INSERT") {
      // The announcement itself (toast, chime, desktop notification) is
      // handled site-wide by BookingAlertsContext — this just keeps the
      // board's own list current.
      setBookings((prev) => (prev.some((b) => b.id === newRow.id) ? prev : [newRow, ...prev]));
      if (newRow.status === "pending") setFreshIds((prev) => new Set(prev).add(newRow.id));
    } else if (eventType === "UPDATE") {
      setBookings((prev) => prev.map((b) => (b.id === newRow.id ? newRow : b)));
      setSelected((prev: any) => (prev?.id === newRow.id ? newRow : prev));
    } else if (eventType === "DELETE") {
      setBookings((prev) => prev.filter((b) => b.id !== oldRow.id));
      setSelected((prev: any) => (prev?.id === oldRow.id ? null : prev));
    }
  });

  // Staff (no Realtime, see above) still see new requests: the alerts layer
  // polls for them and tells this board. Confirm/Decline from a toast or the
  // bell inbox also lands here so the calendar reflects it immediately.
  useEffect(() => {
    return alerts.subscribe((e) => {
      if (e.type === "insert") {
        setBookings((prev) => (prev.some((b) => b.id === e.row.id) ? prev : [e.row, ...prev]));
        if (e.row.status === "pending") setFreshIds((prev) => new Set(prev).add(e.row.id));
      } else {
        setBookings((prev) => prev.map((b) => (b.id === e.id ? { ...b, ...e.changes } : b)));
        setSelected((prev: any) => (prev?.id === e.id ? { ...prev, ...e.changes } : prev));
      }
    });
  }, [alerts.subscribe]);

  // Deep link: /business/bookings?open=<id> (from a toast, the bell, or the
  // new-booking email) opens that booking's panel straight away.
  useEffect(() => {
    if (!openId || loading) return;
    const match = bookings.find((b) => b.id === openId);
    if (match) {
      selectBooking(match);
      if (match.preferred_date) setAnchor(new Date(`${match.preferred_date}T00:00:00`));
    }
    router.replace("/business/bookings", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, loading]);

  function selectBooking(b: any) {
    setSelected(b);
    if (b && freshIds.has(b.id)) {
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(b.id);
        return next;
      });
    }
  }

  function friendlyError(message: string | undefined): string {
    if (message?.includes("PAYMENT_REQUIRED")) return "Take payment first — open the Payment tab to check out and complete this booking.";
    if (message?.includes("PAYMENT_LOCKED")) return "A completed booking stays paid — record a refund in the Payment tab instead.";
    return "Couldn't save that change — please try again.";
  }

  async function updateBooking(id: string, changes: Record<string, any>) {
    const previous = bookings.find((b) => b.id === id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, ...changes }));
    setUpdateError(null);
    // Staff write through the whitelisted RPC (migration v29): a direct
    // UPDATE from a staff session silently matched 0 rows under RLS, so
    // every staff status change used to look saved but never was.
    const { error } = isStaff
      ? await supabase.rpc("update_booking_operational", { p_booking_id: id, p_changes: changes })
      : await supabase.from("bookings").update(changes).eq("id", id);
    if (error && previous) {
      setBookings((prev) => prev.map((b) => (b.id === id ? previous : b)));
      if (selected?.id === id) setSelected(previous);
      setUpdateError(friendlyError(error.message));
      return;
    }
    if (!error && "status" in changes) notifyCustomerOfStatus(id, changes.status);
  }

  function exportCsv() {
    const sorted = [...filtered].sort((a, b) =>
      `${b.preferred_date || b.created_at}`.localeCompare(`${a.preferred_date || a.created_at}`)
    );
    const header = ["Date", "Time", "Customer", "Phone", "Email", "Service", "Vehicle", "Plate", "Status", "Source"];
    if (!isStaff) header.push("Total (BHD)", "Paid", "Method", "Receipt");
    downloadCsv(
      `luupa-bookings-${toKey(new Date())}.csv`,
      header,
      sorted.map((b) => {
        const row: unknown[] = [
          b.preferred_date || toKey(new Date(b.created_at)),
          b.preferred_time || "",
          b.customer_name,
          phoneCell(b.customer_contact),
          b.customer_email || "",
          b.service || "",
          [b.vehicle_make, b.vehicle_model].filter(Boolean).join(" "),
          b.vehicle_plate || "",
          String(b.status || "").replace("_", " "),
          b.source === "manual" ? "Manual" : "Luupa",
        ];
        if (!isStaff) {
          row.push(
            b.amount != null ? Number(b.amount).toFixed(3) : "",
            b.paid ? "Yes" : "No",
            b.payment_method ? PAYMENT_METHOD_LABEL[b.payment_method] || b.payment_method : "",
            b.paid ? receiptNumber(b.id) : ""
          );
        }
        return row;
      })
    );
  }

  // A full row the server already saved (checkout) — merge, no extra write.
  function patchBooking(row: any) {
    setBookings((prev) => prev.map((b) => (b.id === row.id ? { ...b, ...row } : b)));
    setSelected((prev: any) => (prev?.id === row.id ? { ...prev, ...row } : prev));
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
  if (guardState === "error") return <BusinessLoadError onRetry={refresh} />;
  if (guardState === "not_business") return <NotBusinessAccount />;
  if (!business || guardState !== "ready") return null;

  const today = periodComparison(bookings, "day");
  const week = periodComparison(bookings, "week");
  const month = periodComparison(bookings, "month");
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  // Not computed at all for staff — bookings_operational doesn't carry
  // `amount`, so this would be meaningless (always 0) rather than just hidden.
  const revenueThisMonth = isStaff ? 0 : revenueInPeriod(bookings, "month");

  return (
    <div className="bg-canvas2 min-h-screen">
      <div
        className={`mx-auto px-5 sm:px-6 py-8 sm:py-10 transition-[max-width,margin] duration-300 ease-out ${
          selected ? "max-w-none lg:mr-[492px] lg:ml-0" : "max-w-6xl"
        }`}
      >
        {!isStaff && (
          <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        )}

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

        {bookingsLoadError && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle size={15} className="text-red-600 shrink-0" />
            <p className="text-sm text-red-700">Couldn't load your bookings — try refreshing the page.</p>
          </div>
        )}

        {alerts.pending.length > 0 && (
          <NeedsReply
            pending={alerts.pending}
            onRespond={alerts.respond}
            onOpen={(id) => {
              const match = bookings.find((b) => b.id === id);
              if (match) selectBooking(match);
            }}
          />
        )}

        {/* Analytics — a horizontally scrollable row on phones, a full grid
            from tablet up. Clickable, jumps the calendar to that view. */}
        <div className={`flex ${isStaff ? "sm:grid-cols-4" : "sm:grid-cols-5"} sm:grid gap-3 mt-6 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible`}>
          <AnalyticsCard label="Today" data={today} onClick={() => jumpTo("day")} />
          <AnalyticsCard label="This week" data={week} compareLabel="vs last week" onClick={() => jumpTo("week")} />
          <AnalyticsCard label="This month" data={month} compareLabel="vs last month" onClick={() => jumpTo("month")} />
          <SimpleStatCard icon={<Clock3 size={14} />} label="Pending" value={pendingCount} tint={pendingCount > 0 ? "teal" : "stone"} onClick={() => setStatusFilter("pending")} />
          {!isStaff && (
            <SimpleStatCard icon={<Wallet size={14} />} label="Revenue this month" value={formatBhd(revenueThisMonth)} tint="navy" />
          )}
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
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title="Download these bookings as a spreadsheet (CSV)"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 h-[38px] rounded-lg bg-white border border-stone-line text-ink/80 hover:text-ink hover:border-navy/30 transition-colors disabled:opacity-50"
          >
            <Download size={13} /> Export
          </button>
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
            mobile where there's no room for two columns. When a booking is
            selected the whole page content above (stat cards, toolbar) has
            already shrunk out from under the fixed drawer via the wrapper's
            lg:mr-[492px], so this row just needs the calendar column alone —
            no reserved spacer needed once nothing sits behind the drawer. */}
        <div className={selected ? "mt-6" : "mt-6 lg:flex lg:items-start lg:gap-6"}>
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
                    onChange={(e) => setAnchor(clampedDate(anchor.getFullYear(), Number(e.target.value), anchor.getDate()))}
                    className="input text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" })}</option>
                    ))}
                  </select>
                  {view === "day" && (
                    <select
                      value={anchor.getDate()}
                      onChange={(e) => setAnchor(clampedDate(anchor.getFullYear(), anchor.getMonth(), Number(e.target.value)))}
                      className="input text-sm"
                    >
                      {Array.from({ length: daysInMonth(anchor.getFullYear(), anchor.getMonth()) }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={anchor.getFullYear()}
                    onChange={(e) => setAnchor(clampedDate(Number(e.target.value), anchor.getMonth(), anchor.getDate()))}
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
            <MonthGrid anchor={anchor} bookingsOn={bookingsOn} freshIds={freshIds} onSelectDay={(d) => { setAnchor(d); setView("day"); }} />
          )}
          {view === "week" && (
            <WeekGrid anchor={anchor} bookingsOn={bookingsOn} freshIds={freshIds} onSelectBooking={selectBooking} onSelectDay={(d) => { setAnchor(d); setView("day"); }} />
          )}
          {view === "day" && (
            <DayList anchor={anchor} bookingsOn={bookingsOn} freshIds={freshIds} onSelectBooking={selectBooking} />
          )}
          {view === "list" && (
            <AgendaList bookings={filtered} selectedId={selected?.id} freshIds={freshIds} onSelectBooking={selectBooking} />
          )}
        </div>

        {/* Reserved-width spacer so the calendar column doesn't reflow when
            the drawer opens/closes — the drawer itself renders separately
            below since it's fixed-positioned on desktop, not part of this
            column's box. Only rendered when nothing is selected; once a
            booking opens, the outer wrapper's own margin already makes room
            for the drawer, so this spacer would just double up the gap. */}
        {!selected && (
          <div className="mt-6 lg:mt-0 lg:w-[460px] lg:shrink-0">
            <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:h-[calc(100vh-260px)] lg:min-h-[360px] rounded-2xl border border-dashed border-stone-line bg-white/60 text-center px-8">
              <div className="w-14 h-14 rounded-full bg-navy/5 flex items-center justify-center mb-4">
                <MousePointerClick size={22} className="text-navy/50" />
              </div>
              <p className="text-sm font-medium text-ink">Select a booking</p>
              <p className="text-xs text-stone mt-1.5 leading-relaxed">
                Pick anything from the calendar or list to see full details, move its status forward, and send an invoice.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {selected && (
        <BookingDrawer
          booking={selected}
          business={business}
          isStaff={isStaff}
          onUpdate={updateBooking}
          onPatched={patchBooking}
          onClose={() => setSelected(null)}
        />
      )}

      {showAddForm && (
        <ManualBookingForm
          businessId={business.id}
          isStaff={isStaff}
          onAdded={(b) => setBookings((prev) => (prev.some((x) => x.id === b.id) ? prev : [b, ...prev]))}
          onClose={() => setShowAddForm(false)}
        />
      )}

    </div>
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Jumping from Jan 31 to "February" must land on Feb 28/29, not roll over
// into March the way new Date(y, 1, 31) does.
function clampedDate(year: number, month: number, day: number): Date {
  return new Date(year, month, Math.min(day, daysInMonth(year, month)));
}

// Pending requests, front and centre — reply without hunting the calendar.
function NeedsReply({
  pending,
  onRespond,
  onOpen,
}: {
  pending: any[];
  onRespond: (id: string, status: "confirmed" | "declined") => Promise<{ error?: string }>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-teal/25 bg-gradient-to-br from-teal/[0.06] to-white p-4 fade-up">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inset-0 rounded-full bg-teal animate-ping opacity-60" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-teal" />
        </span>
        <BellRing size={14} className="text-teal-dim" />
        {pending.length} {pending.length === 1 ? "request needs" : "requests need"} a reply
      </p>
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {pending.slice(0, 10).map((b) => (
          <NeedsReplyCard key={b.id} booking={b} onRespond={onRespond} onOpen={() => onOpen(b.id)} />
        ))}
      </div>
    </div>
  );
}

function NeedsReplyCard({ booking: b, onRespond, onOpen }: { booking: any; onRespond: (id: string, s: "confirmed" | "declined") => Promise<{ error?: string }>; onOpen: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function act(status: "confirmed" | "declined") {
    setBusy(status);
    await onRespond(b.id, status);
    setBusy(null);
  }
  return (
    <div className="shrink-0 w-[250px] rounded-xl bg-white border border-stone-line p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <button onClick={onOpen} className="w-full text-left">
        <p className="text-sm font-semibold text-ink truncate">{b.customer_name || "Customer"}</p>
        <p className="text-xs text-stone truncate">{b.service || "Service not specified"}</p>
        <p className="text-xs text-navy font-medium mt-1">{formatWhen(b)}</p>
      </button>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={() => act("confirmed")} disabled={!!busy} className="flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-navy text-white hover:bg-navy-light disabled:opacity-60">
          {busy === "confirmed" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirm
        </button>
        <button onClick={() => act("declined")} disabled={!!busy} className="flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg border border-stone-line text-ink hover:text-red-600 hover:border-red-200 disabled:opacity-60">
          {busy === "declined" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Decline
        </button>
      </div>
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

function MonthGrid({ anchor, bookingsOn, freshIds, onSelectDay }: { anchor: Date; bookingsOn: (d: Date) => any[]; freshIds: Set<string>; onSelectDay: (d: Date) => void }) {
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
          const pendingHere = dayBookings.filter((b) => b.status === "pending").length;
          const hasFresh = dayBookings.some((b) => freshIds.has(b.id));
          return (
            <button
              key={i}
              onClick={() => onSelectDay(day)}
              className={`relative aspect-square sm:aspect-[4/3] border-t border-l border-stone-line p-1.5 text-left hover:bg-canvas2 transition-colors overflow-hidden ${
                i % 7 === 6 ? "border-r" : ""
              } ${!inMonth ? "text-stone-dim bg-canvas2/40" : "text-ink"} ${pendingHere > 0 ? "bg-teal/[0.04]" : ""}`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className={`text-xs ${isSameDay(day, today) ? "bg-teal text-white rounded-full w-5 h-5 inline-flex items-center justify-center" : ""}`}>
                  {day.getDate()}
                </span>
                {pendingHere > 0 && (
                  <span className={`text-[9px] font-bold text-white bg-teal rounded-full min-w-[16px] h-4 px-1 inline-flex items-center justify-center ${hasFresh ? "new-glow" : ""}`} title={`${pendingHere} awaiting reply`}>
                    {pendingHere}
                  </span>
                )}
              </span>
              {dayBookings.length > 0 && (
                <>
                  {/* Phones: compact dots. Larger screens: named pills, so a
                      new request reads as a booking, not a speck. */}
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {dayBookings.slice(0, 3).map((b) => (
                      <span key={b.id} className={`w-1.5 h-1.5 rounded-full ${b.status === "pending" ? "bg-teal" : "bg-navy"}`} />
                    ))}
                  </div>
                  <div className="hidden sm:block mt-1 space-y-0.5">
                    {dayBookings.slice(0, 2).map((b) => (
                      <span
                        key={b.id}
                        className={`block truncate text-[10px] leading-4 rounded px-1 ${
                          b.status === "pending" ? "bg-teal/15 text-teal-dim font-semibold" : b.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-navy/10 text-navy"
                        }`}
                      >
                        {b.preferred_time ? `${b.preferred_time} ` : ""}{b.customer_name}
                      </span>
                    ))}
                    {dayBookings.length > 2 && <span className="block text-[9px] text-stone px-1">+{dayBookings.length - 2} more</span>}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewBadge() {
  return <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-white bg-teal px-1.5 py-0.5 rounded-full new-glow">New</span>;
}

function WeekGrid({ anchor, bookingsOn, freshIds, onSelectBooking, onSelectDay }: { anchor: Date; bookingsOn: (d: Date) => any[]; freshIds: Set<string>; onSelectBooking: (b: any) => void; onSelectDay: (d: Date) => void }) {
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
                  className={`w-full text-left text-[10px] rounded px-1.5 py-1 truncate transition-transform hover:scale-[1.03] ${b.status === "pending" ? "bg-teal/15 text-teal-dim font-semibold" : "bg-navy/10 text-navy"} ${freshIds.has(b.id) ? "new-glow" : ""}`}
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

function DayList({ anchor, bookingsOn, freshIds, onSelectBooking }: { anchor: Date; bookingsOn: (d: Date) => any[]; freshIds: Set<string>; onSelectBooking: (b: any) => void }) {
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
            <span className="font-medium text-ink text-sm flex items-center gap-2 min-w-0">
              <span className="truncate">{b.customer_name}</span>
              {freshIds.has(b.id) && <NewBadge />}
            </span>
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
function AgendaList({ bookings, selectedId, freshIds, onSelectBooking }: { bookings: any[]; selectedId?: string; freshIds: Set<string>; onSelectBooking: (b: any) => void }) {
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
    const label = key === today ? "Today" : key === tomorrow ? "Tomorrow" : new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
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
                    <span className="font-medium text-ink text-sm truncate flex items-center gap-2 min-w-0">
                      <span className="truncate">{b.customer_name}</span>
                      {freshIds.has(b.id) && <NewBadge />}
                    </span>
                    <StatusChip status={b.status} />
                  </span>
                  <span className="block text-xs text-stone mt-0.5 truncate">
                    {b.preferred_time && `${b.preferred_time} · `}{b.service || "No service specified"}
                    {b.amount != null && ` · ${formatBhd(b.amount)}`}
                    {b.paid && " · Paid"}
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

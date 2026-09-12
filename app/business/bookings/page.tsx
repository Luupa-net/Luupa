"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { periodComparison } from "@/lib/bookingPeriods";
import { getMonthGrid, getWeekDays, addDays, addMonths, toKey, isSameDay, WEEKDAY_LABELS } from "@/lib/calendarGrid";
import ManualBookingForm from "@/components/ManualBookingForm";
import BookingModal from "@/components/BookingModal";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Plus, TrendingUp, TrendingDown, Minus,
} from "lucide-react";

type View = "month" | "week" | "day";

export default function BookingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  function updateBooking(id: string, changes: Record<string, any>) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));
    supabase.from("bookings").update(changes).eq("id", id);
  }

  function bookingsOn(date: Date) {
    const key = toKey(date);
    return bookings.filter((b) => (b.preferred_date || toKey(new Date(b.created_at))) === key);
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

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">Loading…</div>;
  if (!business) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  const today = periodComparison(bookings, "day");
  const week = periodComparison(bookings, "week");
  const month = periodComparison(bookings, "month");

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Bookings</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg bg-terra text-white hover:bg-terra-dim transition-colors"
          >
            <Plus size={15} /> Add booking
          </button>
        </div>

        {/* Analytics — clickable, jumps the calendar to that view */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <AnalyticsCard label="Today" data={today} onClick={() => jumpTo("day")} />
          <AnalyticsCard label="This week" data={week} compareLabel="vs last week" onClick={() => jumpTo("week")} />
          <AnalyticsCard label="This month" data={month} compareLabel="vs last month" onClick={() => jumpTo("month")} />
        </div>

        {/* Calendar */}
        <div className="mt-6 bg-white rounded-2xl border border-stone-line overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-stone-line relative">
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
              {(["month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md capitalize transition-colors ${
                    view === v ? "bg-navy text-white" : "bg-canvas2 text-ink/70"
                  }`}
                >
                  {v}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-md hover:bg-canvas2 flex items-center justify-center"><ChevronLeft size={15} /></button>
                <button onClick={() => setAnchor(new Date())} className="text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-canvas2">Today</button>
                <button onClick={() => navigate(1)} className="w-7 h-7 rounded-md hover:bg-canvas2 flex items-center justify-center"><ChevronRight size={15} /></button>
              </div>
            </div>
          </div>

          {view === "month" && (
            <MonthGrid anchor={anchor} bookingsOn={bookingsOn} onSelectDay={(d) => { setAnchor(d); setView("day"); }} />
          )}
          {view === "week" && (
            <WeekGrid anchor={anchor} bookingsOn={bookingsOn} onSelectBooking={setSelected} onSelectDay={(d) => { setAnchor(d); setView("day"); }} />
          )}
          {view === "day" && (
            <DayList anchor={anchor} bookingsOn={bookingsOn} onSelectBooking={setSelected} />
          )}
        </div>
      </div>

      {showAddForm && (
        <ManualBookingForm
          businessId={business.id}
          onAdded={(b) => setBookings((prev) => [b, ...prev])}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {selected && (
        <BookingModal
          booking={selected}
          businessName={business.name}
          paymentQrUrl={business.payment_qr_url}
          onUpdate={updateBooking}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function AnalyticsCard({ label, data, compareLabel, onClick }: { label: string; data: { current: number; diff: number }; compareLabel?: string; onClick: () => void }) {
  const TrendIcon = data.diff > 0 ? TrendingUp : data.diff < 0 ? TrendingDown : Minus;
  const trendColor = data.diff > 0 ? "text-emerald-600" : data.diff < 0 ? "text-red-500" : "text-stone";
  return (
    <button onClick={onClick} className="text-left rounded-xl bg-white border border-stone-line px-4 py-3.5 hover:border-navy/30 transition-colors">
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
              <span className={`text-xs ${isSameDay(day, today) ? "bg-terra text-white rounded-full w-5 h-5 inline-flex items-center justify-center" : ""}`}>
                {day.getDate()}
              </span>
              {dayBookings.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayBookings.slice(0, 3).map((b) => (
                    <span key={b.id} className={`w-1.5 h-1.5 rounded-full ${b.status === "pending" ? "bg-terra" : "bg-navy"}`} />
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
              <p className={`text-sm font-medium ${isSameDay(day, today) ? "text-terra" : "text-ink"}`}>{day.getDate()}</p>
            </button>
            <div className="p-1.5 space-y-1">
              {dayBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className={`w-full text-left text-[10px] rounded px-1.5 py-1 truncate ${b.status === "pending" ? "bg-terra/15 text-terra-dim" : "bg-navy/10 text-navy"}`}
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
          className={`w-full text-left rounded-lg border p-3.5 hover:border-navy/30 transition-colors ${
            b.status === "pending" ? "border-terra/30 bg-terra/5" : "border-stone-line bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-ink text-sm">{b.customer_name}</span>
            <span className="text-xs text-stone capitalize">{b.status.replace("_", " ")}</span>
          </div>
          <p className="text-xs text-stone mt-0.5">
            {b.preferred_time && `${b.preferred_time} · `}{b.service || "No service specified"}
          </p>
        </button>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { periodComparison, groupByDate, filterByPeriod } from "@/lib/bookingPeriods";
import ManualBookingForm from "@/components/ManualBookingForm";
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Minus, CircleDollarSign,
  UserCheck, Wrench, CheckCircle2, Clock,
} from "lucide-react";

type Period = "day" | "week" | "month" | "all";

export default function BookingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("week");
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/business/login");
        return;
      }
      const { data: biz } = await supabase.from("businesses").select("id, name").eq("owner_id", user.id).single();
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

  async function updateBooking(id: string, changes: Record<string, any>) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));
    await supabase.from("bookings").update(changes).eq("id", id);
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-16 text-stone">Loading…</div>;
  if (!business) return <div className="max-w-3xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  const today = periodComparison(bookings, "day");
  const week = periodComparison(bookings, "week");
  const month = periodComparison(bookings, "month");
  const filtered = filterByPeriod(bookings, period);
  const grouped = groupByDate(filtered);

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
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

        {/* Analytics — real counts with period-over-period comparison */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <AnalyticsCard label="Today" data={today} />
          <AnalyticsCard label="This week" data={week} compareLabel="vs last week" />
          <AnalyticsCard label="This month" data={month} compareLabel="vs last month" />
        </div>

        {/* Period filter */}
        <div className="flex gap-2 mt-6">
          {(["day", "week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                period === p ? "bg-navy text-white" : "bg-white border border-stone-line text-ink/70"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Agenda list, grouped by date */}
        <div className="mt-6 space-y-6">
          {grouped.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-line">
              <p className="text-stone text-sm">No bookings in this period.</p>
            </div>
          )}
          {grouped.map(({ date, items }) => (
            <div key={date}>
              <p className="text-xs uppercase tracking-wide text-stone font-medium mb-2">
                {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <div className="space-y-2.5">
                {items.map((bk) => (
                  <BookingCard key={bk.id} booking={bk} onUpdate={updateBooking} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

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

function AnalyticsCard({ label, data, compareLabel }: { label: string; data: { current: number; diff: number }; compareLabel?: string }) {
  const TrendIcon = data.diff > 0 ? TrendingUp : data.diff < 0 ? TrendingDown : Minus;
  const trendColor = data.diff > 0 ? "text-emerald-600" : data.diff < 0 ? "text-red-500" : "text-stone";
  return (
    <div className="rounded-xl bg-white border border-stone-line px-4 py-3.5">
      <p className="text-xs text-stone">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink mt-1">{data.current}</p>
      {compareLabel && (
        <p className={`flex items-center gap-1 text-xs mt-1 ${trendColor}`}>
          <TrendIcon size={12} />
          {data.diff > 0 ? "+" : ""}{data.diff} {compareLabel}
        </p>
      )}
    </div>
  );
}

function BookingCard({ booking: bk, onUpdate }: { booking: any; onUpdate: (id: string, changes: Record<string, any>) => void }) {
  return (
    <div className={`rounded-lg border p-4 bg-white ${bk.status === "pending" ? "border-terra/30 bg-terra/5" : "border-stone-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink text-sm">{bk.customer_name}</span>
            {bk.source === "manual" && <span className="text-[10px] text-stone bg-canvas2 px-1.5 py-0.5 rounded">Manual</span>}
          </div>
          <p className="text-xs text-stone mt-0.5">{bk.customer_contact}</p>
        </div>
        <BookingStatusPill status={bk.status} />
      </div>

      <div className="flex items-center gap-3 mt-2 text-sm text-ink/80">
        {bk.service && <span className="flex items-center gap-1"><Wrench size={12} className="text-stone" /> {bk.service}</span>}
        {bk.preferred_time && <span className="flex items-center gap-1"><Clock size={12} className="text-stone" /> {bk.preferred_time}</span>}
      </div>

      <BookingActions booking={bk} onUpdate={onUpdate} />
    </div>
  );
}

function BookingActions({ booking: bk, onUpdate }: { booking: any; onUpdate: (id: string, changes: Record<string, any>) => void }) {
  const btn = "text-xs font-medium px-3 py-1.5 rounded-md transition-colors";

  if (bk.status === "pending") {
    return (
      <div className="flex gap-2 mt-3">
        <button onClick={() => onUpdate(bk.id, { status: "confirmed" })} className={`${btn} bg-navy text-white hover:bg-navy-light`}>Confirm</button>
        <button onClick={() => onUpdate(bk.id, { status: "declined" })} className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`}>Decline</button>
      </div>
    );
  }
  if (bk.status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => onUpdate(bk.id, { status: "arrived" })} className={`${btn} bg-navy text-white hover:bg-navy-light`}>
          <UserCheck size={12} className="inline mr-1" /> Customer arrived
        </button>
        <button onClick={() => onUpdate(bk.id, { status: "no_show" })} className={`${btn} border border-stone-line text-stone hover:bg-canvas2`}>No-show</button>
        <button onClick={() => onUpdate(bk.id, { status: "cancelled" })} className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`}>Cancel</button>
      </div>
    );
  }
  if (bk.status === "arrived") {
    return (
      <div className="flex gap-2 mt-3">
        <button onClick={() => onUpdate(bk.id, { status: "in_progress" })} className={`${btn} bg-navy text-white hover:bg-navy-light`}>Car left with us</button>
      </div>
    );
  }
  if (bk.status === "in_progress") {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => onUpdate(bk.id, { status: "completed" })} className={`${btn} bg-navy text-white hover:bg-navy-light`}>
          <CheckCircle2 size={12} className="inline mr-1" /> Mark completed
        </button>
        {!bk.paid && (
          <button onClick={() => onUpdate(bk.id, { paid: true })} className={`${btn} border border-emerald-200 text-emerald-700 hover:bg-emerald-50`}>
            <CircleDollarSign size={12} className="inline mr-1" /> Mark paid
          </button>
        )}
      </div>
    );
  }
  if (bk.status === "completed" && !bk.paid) {
    return (
      <div className="flex gap-2 mt-3">
        <button onClick={() => onUpdate(bk.id, { paid: true })} className={`${btn} border border-emerald-200 text-emerald-700 hover:bg-emerald-50`}>
          <CircleDollarSign size={12} className="inline mr-1" /> Mark paid
        </button>
      </div>
    );
  }
  return null;
}

function BookingStatusPill({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: "bg-terra/15 text-terra-dim",
    confirmed: "bg-navy/10 text-navy",
    arrived: "bg-amber-100 text-amber-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    declined: "bg-stone-line text-stone",
    no_show: "bg-stone-line text-stone",
    cancelled: "bg-stone-line text-stone",
  };
  const labels: Record<string, string> = {
    in_progress: "With us",
    no_show: "No-show",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${config[status] || "bg-stone-line text-stone"}`}>
      {labels[status] || status}
    </span>
  );
}

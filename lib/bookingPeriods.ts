// All native Date math — deliberately no new date library added, so this
// doesn't depend on an npm install that couldn't be verified this session.

import { startOfWeekSat, toKey } from "./calendarGrid";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Reuses calendarGrid's Saturday-first week start (Gulf convention) — this
// used to compute its own Sunday-first boundary, so the "This week" stat
// card and the Week calendar view it jumps to (getWeekDays, also Sat-first)
// disagreed on which bookings counted as "this week".
function startOfWeek(d: Date) {
  return startOfWeekSat(d);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getPeriodBounds(period: "day" | "week" | "month", offset = 0) {
  const now = new Date();
  if (period === "day") {
    const start = startOfDay(now);
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === "week") {
    const start = startOfWeek(now);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = startOfMonth(now);
  start.setMonth(start.getMonth() + offset);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

// The day a booking is FOR (its appointment date), falling back to when it
// was made for a booking with no date. Local-midnight parse — a bare
// "YYYY-MM-DD" would otherwise be read as UTC.
export function appointmentDate(b: { preferred_date?: string | null; created_at: string }): Date {
  return b.preferred_date ? new Date(`${b.preferred_date}T00:00:00`) : new Date(b.created_at);
}

// Counted by appointment date, not creation date: the "Today" card jumps to
// the Day view of today's appointments, so it has to count the same thing
// (it used to count bookings *made* today, which never matched that view).
export function countInPeriod(bookings: any[], period: "day" | "week" | "month", offset = 0): number {
  const { start, end } = getPeriodBounds(period, offset);
  return bookings.filter((b) => {
    const when = appointmentDate(b);
    return when >= start && when < end;
  }).length;
}

// Money actually taken in a period, by when it was paid (falls back to the
// appointment date for bookings paid before paid_at existed).
export function revenueInPeriod(bookings: any[], period: "day" | "week" | "month", offset = 0): number {
  const { start, end } = getPeriodBounds(period, offset);
  return bookings
    .filter((b) => {
      if (!b.paid || b.amount == null) return false;
      const when = b.paid_at ? new Date(b.paid_at) : appointmentDate(b);
      return when >= start && when < end;
    })
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
}

export function periodComparison(bookings: any[], period: "day" | "week" | "month") {
  const current = countInPeriod(bookings, period, 0);
  const previous = countInPeriod(bookings, period, -1);
  const diff = current - previous;
  return { current, previous, diff };
}

export function groupByDate(bookings: any[]): { date: string; items: any[] }[] {
  const groups: Record<string, any[]> = {};
  for (const b of bookings) {
    // toKey(), not toISOString().slice(0,10) — the latter converts to UTC
    // first, shifting bookings created after 9pm UTC back a calendar day for
    // anyone in Bahrain (UTC+3). Same reasoning as calendarGrid.ts's toKey().
    const key = b.preferred_date || toKey(new Date(b.created_at));
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  }
  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({ date, items }));
}

export function filterByPeriod(bookings: any[], period: "day" | "week" | "month" | "all"): any[] {
  if (period === "all") return bookings;
  const { start, end } = getPeriodBounds(period, 0);
  return bookings.filter((b) => {
    const ref = appointmentDate(b);
    return ref >= start && ref < end;
  });
}

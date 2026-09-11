// All native Date math — deliberately no new date library added, so this
// doesn't depend on an npm install that couldn't be verified this session.

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sunday
  x.setDate(x.getDate() - day);
  return x;
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

export function countInPeriod(bookings: any[], period: "day" | "week" | "month", offset = 0): number {
  const { start, end } = getPeriodBounds(period, offset);
  return bookings.filter((b) => {
    const created = new Date(b.created_at);
    return created >= start && created < end;
  }).length;
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
    const key = b.preferred_date || new Date(b.created_at).toISOString().slice(0, 10);
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
    const ref = b.preferred_date ? new Date(b.preferred_date) : new Date(b.created_at);
    return ref >= start && ref < end;
  });
}

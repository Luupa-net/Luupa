// Native Date math only — no calendar library dependency to risk installing.
// Weeks start on Saturday, matching the Gulf convention (Sat–Fri).

const SAT_FIRST_OFFSET = 6; // JS getDay(): 0=Sun...6=Sat. We want Sat=0 in our own indexing.

function toSatFirstIndex(jsDay: number): number {
  return (jsDay + 1) % 7; // Sun(0)->1, Mon(1)->2, ... Sat(6)->0
}

export function startOfWeekSat(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - toSatFirstIndex(x.getDay()));
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function toKey(d: Date): string {
  // Deliberately NOT using toISOString() here — that converts to UTC first,
  // which shifts the date backward by a day for anyone in Bahrain (UTC+3)
  // whenever it's past 9pm UTC. These getters are local-time-based instead.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toKey(a) === toKey(b);
}

/** 6 weeks x 7 days, Saturday-first, always fully covering the month. */
export function getMonthGrid(anchor: Date): Date[][] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeekSat(firstOfMonth);
  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeekSat(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

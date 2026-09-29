import type { ReactNode } from "react";

// Shared "icon + number + label" stat tile — was previously copy-pasted as
// KpiCard (app/business/dashboard/page.tsx), AnalyticsCard/SimpleStatCard
// (app/business/bookings/page.tsx), and StatCard (app/admin/page.tsx), each
// with near-identical markup and a slightly different tint palette.
// Consolidated here; existing call sites aren't migrated in the change that
// introduced this file (out of scope), but new stat tiles should use this.
const TINTS = {
  navy: "bg-navy/10 text-navy",
  teal: "bg-teal/10 text-teal-dim",
  emerald: "bg-emerald-100 text-emerald-700",
  stone: "bg-stone-line text-stone",
} as const;

export default function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tint: keyof typeof TINTS;
}) {
  return (
    <div className="shrink-0 w-[160px] sm:w-auto rounded-2xl bg-white border border-stone-line px-4 py-4 shadow-sm shadow-black/[0.02] transition-shadow hover:shadow-md">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TINTS[tint]}`}>{icon}</div>
      <p className="font-display text-2xl font-semibold text-ink mt-2.5">{value}</p>
      <p className="text-xs text-stone mt-0.5">{label}</p>
    </div>
  );
}

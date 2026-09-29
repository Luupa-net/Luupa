// Shared booking-status pill — was previously copy-pasted as StatusChip
// (app/business/bookings/page.tsx) and RecentStatusChip
// (app/business/dashboard/page.tsx) with an identical tone map. Consolidated
// here so a status-color change only has to happen in one place; the two
// original call sites aren't migrated to this yet (out of scope for the
// change that introduced this file), but any new status-pill usage should
// reach for this instead of adding a fourth copy.
const TONES: Record<string, string> = {
  pending: "bg-teal/10 text-teal-dim",
  confirmed: "bg-navy/10 text-navy",
  arrived: "bg-skyblue/10 text-skyblue-dim",
  in_progress: "bg-skyblue/10 text-skyblue-dim",
  completed: "bg-emerald-100 text-emerald-700",
  declined: "bg-stone-line text-stone",
  no_show: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
};

export default function BookingStatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const sizeClasses = size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span className={`shrink-0 font-medium rounded-full capitalize ${sizeClasses} ${TONES[status] || "bg-stone-line text-stone"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

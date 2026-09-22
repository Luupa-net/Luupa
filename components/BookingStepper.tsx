const STAGES = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "In Service" },
  { key: "completed", label: "Done" },
];

const EXCEPTION_STATES: Record<string, { label: string; color: string }> = {
  declined: { label: "Declined", color: "bg-white/15 text-white" },
  no_show: { label: "No-show", color: "bg-white/15 text-white" },
  cancelled: { label: "Cancelled", color: "bg-red-500/25 text-white" },
};

export default function BookingStepper({ status }: { status: string }) {
  if (EXCEPTION_STATES[status]) {
    const ex = EXCEPTION_STATES[status];
    return (
      <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${ex.color}`}>
        {ex.label}
      </span>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.key === status);
  // Track fill runs center-to-center between the first and last circle, not
  // edge-to-edge of the row — so it's driven by the same index math as which
  // stage is "done", rather than two slightly different notions of progress.
  const progressPct = currentIndex <= 0 ? 0 : (currentIndex / (STAGES.length - 1)) * 100;

  return (
    <div className="relative">
      {/* One continuous track behind every circle, instead of a separate
          mini-segment stitched between each pair — avoids the seams/overlap
          that made the old version look cramped at this width. */}
      <div className="absolute left-[14px] right-[14px] top-3.5 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="relative flex justify-between">
        {STAGES.map((stage, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <div key={stage.key} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                  done
                    ? "bg-teal text-white"
                    : current
                    ? "bg-white text-navy scale-110 shadow-[0_0_0_4px_rgba(255,255,255,0.18)]"
                    : "bg-navy-light text-white/50"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[9px] leading-tight text-center whitespace-nowrap transition-colors ${
                  current ? "text-white font-semibold" : done ? "text-white/70" : "text-white/35"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  return (
    <div className="flex items-center">
      {STAGES.map((stage, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                  done ? "bg-teal text-white" : current ? "bg-white text-navy ring-4 ring-white/25 scale-110" : "bg-white/10 text-white/40"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] whitespace-nowrap transition-colors ${current ? "text-white font-semibold" : done ? "text-white/70" : "text-white/35"}`}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 -mt-4 bg-white/10 overflow-hidden rounded-full">
                <div
                  className="h-full bg-teal transition-all duration-500 ease-out"
                  style={{ width: done ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const STAGES = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "In Service" },
  { key: "completed", label: "Done" },
];

const EXCEPTION_STATES: Record<string, { label: string; color: string }> = {
  declined: { label: "Declined", color: "bg-stone-line text-stone" },
  no_show: { label: "No-show", color: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-600" },
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
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  done ? "bg-navy text-white" : current ? "bg-terra text-white ring-4 ring-terra/20" : "bg-canvas2 text-stone-dim"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] whitespace-nowrap ${current ? "text-terra-dim font-semibold" : "text-stone"}`}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 -mt-4 ${done ? "bg-navy" : "bg-canvas2"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

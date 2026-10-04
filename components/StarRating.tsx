"use client";

import { useState } from "react";
import { Star } from "lucide-react";

// Two modes by whether onChange is passed. Read-only uses a clipped overlay
// so it can show any fractional value (rating_avg is numeric(2,1), e.g.
// 4.3) — not just half-steps. Interactive is always integer 1-5, so it
// skips the clip trick and just colors each star directly.
export default function StarRating({
  value,
  onChange,
  size = 16,
  showValue = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  showValue?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (onChange) {
    const display = hover ?? value;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(null)}
            aria-label={`Rate ${i + 1} star${i === 0 ? "" : "s"}`}
            className={i < display ? "text-teal" : "text-stone-line hover:text-teal/50"}
          >
            <Star size={size} fill="currentColor" stroke="none" />
          </button>
        ))}
      </div>
    );
  }

  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative inline-flex" style={{ height: size }}>
        <div className="flex gap-0.5 text-stone-line">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={size} fill="currentColor" stroke="none" />
          ))}
        </div>
        <div className="absolute inset-0 flex gap-0.5 text-teal overflow-hidden" style={{ width: `${percent}%` }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={size} fill="currentColor" stroke="none" />
          ))}
        </div>
      </div>
      {showValue && <span className="text-sm font-medium text-ink">{value.toFixed(1)}</span>}
    </div>
  );
}

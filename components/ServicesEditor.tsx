"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export default function ServicesEditor({
  services,
  onChange,
}: {
  services: string[];
  onChange: (services: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    if (input.trim()) {
      onChange([...services, input.trim()]);
      setInput("");
    }
  }

  function remove(i: number) {
    onChange(services.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="e.g. Ceramic coating — from BHD 80"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="w-11 h-11 shrink-0 rounded-lg bg-navy text-white flex items-center justify-center hover:bg-navy-light transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {services.length === 0 && <p className="text-sm text-stone">No services listed yet.</p>}
        {services.map((s, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 text-sm border border-stone-line">
            <span className="text-ink">{s}</span>
            <button onClick={() => remove(i)} aria-label="Remove"><X size={15} className="text-stone" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

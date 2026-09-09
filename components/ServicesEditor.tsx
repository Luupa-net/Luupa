"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Service } from "@/lib/taxonomy";

export default function ServicesEditor({
  services,
  onChange,
}: {
  services: Service[];
  onChange: (services: Service[]) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function add() {
    if (name.trim()) {
      onChange([...services, { name: name.trim(), price: price.trim() || undefined }]);
      setName("");
      setPrice("");
    }
  }

  function remove(i: number) {
    onChange(services.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_120px_44px] gap-2">
        <input
          className="input"
          placeholder="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <input
          className="input"
          placeholder="BHD (optional)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="w-11 h-11 rounded-lg bg-navy text-white flex items-center justify-center hover:bg-navy-light transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Aligned list — name left, price right — stays readable no matter how many services */}
      <div className="mt-3 space-y-1.5">
        {services.length === 0 && <p className="text-sm text-stone">No services listed yet.</p>}
        {services.map((s, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-lg pl-4 pr-2 py-2.5 text-sm border border-stone-line">
            <span className="text-ink truncate">{s.name}</span>
            <div className="flex items-center gap-3 shrink-0">
              {s.price && <span className="text-stone">BHD {s.price}</span>}
              <button onClick={() => remove(i)} aria-label="Remove" className="w-7 h-7 flex items-center justify-center">
                <X size={15} className="text-stone" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

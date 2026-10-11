"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full border border-stone-line text-ink hover:bg-canvas2 transition-colors"
    >
      <Printer size={14} /> Print / save PDF
    </button>
  );
}

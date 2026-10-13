"use client";

import { Download, Printer } from "lucide-react";

// Both open the browser's print dialog — "Save as PDF" is the download path
// on every desktop browser and the share sheet on phones. Never printed.
export default function ReceiptActions() {
  const base = "flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors";
  return (
    <div className="print:hidden flex items-center justify-center gap-2.5 mt-5">
      <button type="button" onClick={() => window.print()} className={`${base} bg-navy text-white hover:bg-navy-light`}>
        <Download size={15} /> Download PDF
      </button>
      <button type="button" onClick={() => window.print()} className={`${base} border border-stone-line bg-white text-ink hover:bg-canvas2`}>
        <Printer size={15} /> Print
      </button>
    </div>
  );
}

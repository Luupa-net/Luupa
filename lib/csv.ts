// Tiny CSV writer for "Export" buttons — opens cleanly in Excel / Google
// Sheets / Numbers (UTF-8 BOM so Arabic names and "BHD" render correctly).
// Cells that start with = + - @ are prefixed with ' so a spreadsheet never
// evaluates customer-typed text as a formula (CSV injection).
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Phone numbers as "973 37786735": a leading "+" would trip the formula
// guard above (showing a stray apostrophe), and bare digits turn into
// 9.73E+10 in Excel. A space keeps it text and still readable.
export function phoneCell(digits: string | null | undefined): string {
  const d = String(digits || "").replace(/\D/g, "");
  if (!d) return "";
  return d.length > 8 ? `${d.slice(0, d.length - 8)} ${d.slice(-8)}` : d;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

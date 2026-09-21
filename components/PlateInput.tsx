"use client";

import { useState } from "react";

const COUNTRIES = ["Bahrain", "Saudi Arabia", "UAE", "Kuwait", "Qatar", "Oman"];

// Abu Dhabi uses a numeric code; the others use a letter code — this genuinely
// varies by emirate, not a simplification.
const EMIRATES = [
  { name: "Abu Dhabi", codeType: "number" as const },
  { name: "Dubai", codeType: "letter" as const },
  { name: "Sharjah", codeType: "letter" as const },
  { name: "Ajman", codeType: "letter" as const },
  { name: "Umm Al Quwain", codeType: "letter" as const },
  { name: "Ras Al Khaimah", codeType: "letter" as const },
  { name: "Fujairah", codeType: "letter" as const },
];

// Field structure per country, based on how each GCC country's plates
// actually work — not every country uses the same layout.
const STRUCTURE: Record<string, "numbers-only" | "letters-and-numbers" | "code-and-numbers"> = {
  Bahrain: "numbers-only",
  Qatar: "numbers-only",
  "Saudi Arabia": "letters-and-numbers",
  Kuwait: "code-and-numbers",
  Oman: "code-and-numbers",
};

const ABBREV_TO_COUNTRY: Record<string, string> = {
  BH: "Bahrain", SA: "Saudi Arabia", KW: "Kuwait", QA: "Qatar", OM: "Oman",
};
const EMIRATE_NAMES = [...EMIRATES.map((e) => e.name)].sort((a, b) => b.length - a.length);

// Reverses emit()'s formatting so a plate already on file (e.g. an existing
// booking's vehicle_plate) actually shows up instead of rendering blank —
// same "parse the stored value back into fields" idea as PhoneInput.
function parseStoredPlate(value: string): { country: string; emirate: string; code: string; numbers: string } {
  const trimmed = (value || "").trim();
  if (!trimmed) return { country: "Bahrain", emirate: "Dubai", code: "", numbers: "" };

  if (trimmed.startsWith("UAE-")) {
    const rest = trimmed.slice(4);
    const emirate = EMIRATE_NAMES.find((name) => rest.startsWith(name)) || "Dubai";
    const parts = rest.slice(emirate.length).trim().split(/\s+/).filter(Boolean);
    const code = parts.length > 1 ? parts[0] : "";
    const numbers = parts.length > 1 ? parts.slice(1).join(" ") : (parts[0] || "");
    return { country: "UAE", emirate, code, numbers };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const country = ABBREV_TO_COUNTRY[parts[0]] || "Bahrain";
  const rest = parts.slice(1);
  if (STRUCTURE[country] === "numbers-only") {
    return { country, emirate: "Dubai", code: "", numbers: rest.join(" ") };
  }
  return { country, emirate: "Dubai", code: rest[0] || "", numbers: rest.slice(1).join(" ") };
}

export default function PlateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (formatted: string) => void;
}) {
  const initial = parseStoredPlate(value);
  const [country, setCountry] = useState(initial.country);
  const [emirate, setEmirate] = useState(initial.emirate);
  const [code, setCode] = useState(initial.code);
  const [numbers, setNumbers] = useState(initial.numbers);

  function emit(nextCountry: string, nextEmirate: string, nextCode: string, nextNumbers: string) {
    setCountry(nextCountry);
    setEmirate(nextEmirate);
    setCode(nextCode);
    setNumbers(nextNumbers);

    if (nextCountry === "UAE") {
      onChange(`UAE-${nextEmirate} ${nextCode} ${nextNumbers}`.trim());
    } else if (STRUCTURE[nextCountry] === "numbers-only") {
      onChange(`${countryAbbrev(nextCountry)} ${nextNumbers}`.trim());
    } else {
      onChange(`${countryAbbrev(nextCountry)} ${nextCode} ${nextNumbers}`.trim());
    }
  }

  const emirateInfo = EMIRATES.find((e) => e.name === emirate);
  const structure = country === "UAE" ? (emirateInfo?.codeType === "number" ? "code-and-numbers" : "letters-and-numbers") : STRUCTURE[country];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={country} onChange={(e) => emit(e.target.value, emirate, "", "")} className="input">
          {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {country === "UAE" && (
          <select value={emirate} onChange={(e) => emit(country, e.target.value, "", "")} className="input">
            {EMIRATES.map((e) => <option key={e.name}>{e.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {structure !== "numbers-only" && (
          <input
            placeholder={structure === "letters-and-numbers" ? "Letter(s)" : "Code"}
            value={code}
            onChange={(e) => emit(country, emirate, e.target.value, numbers)}
            className="input"
          />
        )}
        <input
          placeholder="Number"
          value={numbers}
          onChange={(e) => emit(country, emirate, code, e.target.value)}
          className={`input ${structure === "numbers-only" ? "col-span-2" : ""}`}
        />
      </div>
    </div>
  );
}

function countryAbbrev(country: string): string {
  const map: Record<string, string> = {
    Bahrain: "BH", "Saudi Arabia": "SA", Kuwait: "KW", Qatar: "QA", Oman: "OM",
  };
  return map[country] || country;
}

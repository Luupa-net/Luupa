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

export default function PlateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (formatted: string) => void;
}) {
  const [country, setCountry] = useState("Bahrain");
  const [emirate, setEmirate] = useState("Dubai");
  const [code, setCode] = useState("");
  const [numbers, setNumbers] = useState("");

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

"use client";

import { useState } from "react";

// Bahrain first (primary market), then the rest of the GCC, then other
// countries with a real expat/customer presence in Bahrain. Not every country
// on Earth — a realistic, honest list rather than a false-complete one.
const COUNTRIES = [
  { code: "973", name: "Bahrain", flag: "🇧🇭" },
  { code: "966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "971", name: "UAE", flag: "🇦🇪" },
  { code: "965", name: "Kuwait", flag: "🇰🇼" },
  { code: "974", name: "Qatar", flag: "🇶🇦" },
  { code: "968", name: "Oman", flag: "🇴🇲" },
  { code: "20", name: "Egypt", flag: "🇪🇬" },
  { code: "962", name: "Jordan", flag: "🇯🇴" },
  { code: "961", name: "Lebanon", flag: "🇱🇧" },
  { code: "963", name: "Syria", flag: "🇸🇾" },
  { code: "964", name: "Iraq", flag: "🇮🇶" },
  { code: "216", name: "Tunisia", flag: "🇹🇳" },
  { code: "212", name: "Morocco", flag: "🇲🇦" },
  { code: "213", name: "Algeria", flag: "🇩🇿" },
  { code: "91", name: "India", flag: "🇮🇳" },
  { code: "92", name: "Pakistan", flag: "🇵🇰" },
  { code: "880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "94", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "63", name: "Philippines", flag: "🇵🇭" },
  { code: "60", name: "Malaysia", flag: "🇲🇾" },
  { code: "62", name: "Indonesia", flag: "🇮🇩" },
  { code: "44", name: "UK", flag: "🇬🇧" },
  { code: "1", name: "US / Canada", flag: "🇺🇸" },
];

// Country codes have no fixed length (Bahrain's is 3 digits, the US's is 1),
// and the stored value is just the digits concatenated with no delimiter —
// so splitting it back into code + local number means matching against the
// known list of codes, longest first, rather than blindly slicing off a
// fixed number of digits (which silently ate real digits off the front of
// the local number whenever the code wasn't exactly 4 digits long).
const CODES_BY_LENGTH_DESC = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

function splitStoredNumber(value: string): { code: string; local: string } {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { code: "973", local: "" };
  const match = CODES_BY_LENGTH_DESC.find((c) => digits.startsWith(c.code));
  return match ? { code: match.code, local: digits.slice(match.code.length) } : { code: "973", local: digits };
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = "Phone number",
}: {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
}) {
  const initial = splitStoredNumber(value);
  const [countryCode, setCountryCode] = useState(initial.code);
  const [localNumber, setLocalNumber] = useState(initial.local);

  function update(code: string, local: string) {
    setCountryCode(code);
    setLocalNumber(local);
    onChange(`${code}${local.replace(/\D/g, "")}`);
  }

  return (
    <div className="flex gap-2">
      {/* !w-* is required here: the global .input class sets width:100% and
          wins the cascade over a plain w-[…] utility (same specificity,
          later in source order), which used to blow this select up to fill
          the row and squeeze the number field down to almost nothing. */}
      <select
        value={countryCode}
        onChange={(e) => update(e.target.value, localNumber)}
        className="input !w-[104px] shrink-0 px-2"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.flag} +{c.code}</option>
        ))}
      </select>
      <input
        placeholder={placeholder}
        value={localNumber}
        onChange={(e) => update(countryCode, e.target.value)}
        className="input flex-1 min-w-0"
      />
    </div>
  );
}

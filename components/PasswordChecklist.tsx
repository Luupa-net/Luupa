"use client";

import { Check, X } from "lucide-react";

// Mirrors the Supabase project's password policy exactly (8+ characters with
// lower case, upper case, a digit and a symbol). The checklist used to ask
// for less than Supabase enforces, so a business owner could tick every box,
// fill in all five sign-up steps, and only then be rejected with a raw
// "Password should contain at least one character of each: abc…" error.
export function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordIsValid(password: string) {
  const c = passwordChecks(password);
  return c.length && c.lower && c.upper && c.number && c.symbol;
}

// Supabase's own wording for a policy rejection is a wall of characters —
// turn it into something a person can act on.
export function friendlyAuthError(message: string | undefined | null): string {
  if (!message) return "Something went wrong — please try again.";
  if (/at least one character of each/i.test(message) || /weak/i.test(message)) {
    return "Use at least 8 characters with an upper-case letter, a lower-case letter, a number and a symbol.";
  }
  if (/already registered|already been registered|already exists/i.test(message)) {
    return "There's already an account with this email — log in instead, or reset your password.";
  }
  if (/rate limit|too many/i.test(message)) return "Too many attempts — wait a minute and try again.";
  return message;
}

export default function PasswordChecklist({ password }: { password: string }) {
  const checks = passwordChecks(password);
  const items = [
    { key: "length", label: "8+ characters" },
    { key: "upper", label: "Upper case" },
    { key: "lower", label: "Lower case" },
    { key: "number", label: "Number" },
    { key: "symbol", label: "Symbol" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
      {items.map((item) => {
        const met = checks[item.key];
        return (
          <span key={item.key} className={`flex items-center gap-1 text-xs transition-colors ${met ? "text-teal-dim" : "text-stone-dim"}`}>
            {met ? <Check size={12} /> : <X size={12} />}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

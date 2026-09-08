"use client";

import { Check, X } from "lucide-react";

export function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    letter: /[a-zA-Z]/.test(password),
  };
}

export function passwordIsValid(password: string) {
  const c = passwordChecks(password);
  return c.length && c.number && c.letter;
}

export default function PasswordChecklist({ password }: { password: string }) {
  const checks = passwordChecks(password);
  const items = [
    { key: "length", label: "8+ characters" },
    { key: "letter", label: "One letter" },
    { key: "number", label: "One number" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {items.map((item) => {
        const met = checks[item.key];
        return (
          <span key={item.key} className={`flex items-center gap-1 text-xs ${met ? "text-navy" : "text-stone-dim"}`}>
            {met ? <Check size={12} /> : <X size={12} />}
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

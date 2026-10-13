"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { CONTACT_ROLES, CONTACT_TOPICS, type ContactTopicKey } from "@/lib/support";
import { formatPhoneDisplay } from "@/lib/validation";

type Role = (typeof CONTACT_ROLES)[number]["key"];

const BUSINESS_TOPICS: ContactTopicKey[] = ["listing", "verification"];

export default function ContactForm({ initialTopic }: { initialTopic?: ContactTopicKey }) {
  const [role, setRole] = useState<Role>(initialTopic && BUSINESS_TOPICS.includes(initialTopic) ? "business" : "driver");
  const [topic, setTopic] = useState<ContactTopicKey | "">(initialTopic ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [car, setCar] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — hidden from people
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const sentRef = useRef<HTMLDivElement>(null);

  // The thank-you card is shorter than the form — bring it into view.
  useEffect(() => {
    if (sent) sentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [sent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Add your name.");
    if (phone.replace(/\D/g, "").length < 8) return setError("Enter a valid phone number, like 3600 0000.");
    if (!topic) return setError("Choose what your message is about.");
    if (message.trim().length < 5) return setError("Add a few words about how we can help.");

    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, role, topic, car, message, website }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Your message didn't send — try again in a moment.");
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setSent(false);
    setTopic("");
    setCar("");
    setMessage("");
  }

  if (sent) {
    return (
      <div ref={sentRef} className="rounded-3xl border border-stone-line bg-white p-8 sm:p-10 flex flex-col items-center text-center justify-center fade-up">
        <span className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-teal" />
        </span>
        <h2 className="font-displayAlt text-2xl font-bold text-ink mt-5">Message sent</h2>
        <p className="text-stone font-bodyAlt mt-2 max-w-sm leading-relaxed">
          Thanks, {name.trim().split(" ")[0]}. We'll get back to you on {formatPhoneDisplay(phone) || phone.trim()}
          {email.trim() ? " or by email" : ""}, usually the same day.
        </p>
        <button onClick={reset} className="mt-6 text-sm font-bodyAlt font-bold text-teal hover:text-teal-dim">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-stone-line bg-white p-6 sm:p-8 space-y-5">
      <div>
        <p className="text-sm font-medium text-ink mb-2">I'm a…</p>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-canvas2 p-1.5">
          {CONTACT_ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              aria-pressed={role === r.key}
              className={`h-10 rounded-lg text-sm font-medium transition-all ${
                role === r.key ? "bg-white text-ink shadow-sm" : "text-stone hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Your name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Yousif Ahmed" maxLength={100} />
        </Field>
        <Field label="Phone / WhatsApp">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone pointer-events-none">+973</span>
            <input
              className="input"
              style={{ paddingLeft: 56 }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="3600 0000"
              maxLength={20}
            />
          </div>
        </Field>
      </div>

      <div className={`grid gap-4 ${role === "driver" ? "sm:grid-cols-2" : ""}`}>
        <Field label="Email" hint="Optional">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" maxLength={200} />
        </Field>
        {role === "driver" && (
          <Field label="Your car" hint="Optional">
            <input className="input" value={car} onChange={(e) => setCar(e.target.value)} placeholder="Toyota Land Cruiser 2022" maxLength={100} />
          </Field>
        )}
      </div>

      <Field label="What's it about?">
        <select className="input" value={topic} onChange={(e) => setTopic(e.target.value as ContactTopicKey)}>
          <option value="" disabled>Choose a topic</option>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Message">
        <textarea
          className="input"
          style={{ height: "auto", minHeight: 140, paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={role === "business" ? "Tell us about your business and how we can help." : "Tell us what you need — include the business name or booking date if it's about a booking."}
          maxLength={3000}
        />
      </Field>

      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="w-full h-12 rounded-full bg-teal text-white font-bodyAlt font-bold flex items-center justify-center gap-2 hover:bg-teal-dim active:scale-[0.99] transition-all disabled:opacity-70"
      >
        {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
        {sending ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs text-stone text-center">We only use your details to reply to this message.</p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm font-medium text-ink mb-1.5">
        {label}
        {hint && <span className="text-xs font-normal text-stone">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

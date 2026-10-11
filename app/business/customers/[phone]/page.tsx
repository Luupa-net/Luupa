"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBusinessGuard } from "@/lib/useBusinessGuard";
import { useParams } from "next/navigation";
import Link from "next/link";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { formatBhd } from "@/lib/money";
import BusinessLoadError from "@/components/BusinessLoadError";
import NotBusinessAccount from "@/components/NotBusinessAccount";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import ManualBookingForm from "@/components/ManualBookingForm";
import {
  ArrowLeft, Phone, Mail, CalendarClock, Wallet, Sparkles, Car, StickyNote,
  Tag as TagIcon, ClipboardList, MessageCircle, CalendarPlus, Check, AlertCircle, ChevronRight,
} from "lucide-react";

function visitDate(b: any): Date {
  return b.preferred_date ? new Date(`${b.preferred_date}T00:00:00`) : new Date(b.created_at);
}

function mode(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best: string | null = null;
  let bestCount = 0;
  counts.forEach((c, v) => {
    if (c > bestCount) { best = v; bestCount = c; }
  });
  return best;
}

const QUICK_TAGS = ["VIP", "Regular", "Fleet", "New", "At risk"];

export default function CustomerDetailPage() {
  const params = useParams<{ phone: string }>();
  const phone = params.phone;
  const { business, state: guardState, refresh } = useBusinessGuard({ ownerOnly: true });
  const [bookings, setBookings] = useState<any[]>([]);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showBook, setShowBook] = useState(false);

  useEffect(() => {
    if (guardState !== "ready") {
      if (guardState !== "checking") setLoading(false);
      return;
    }
    async function load() {
      if (!phone) {
        setLoading(false);
        return;
      }
      // Fetch every booking for this business, then filter client-side by
      // normalized phone — bookings.customer_id is null for walk-ins, so
      // phone is the only key that works for every booking.
      const { data: bks, error } = await supabase.from("bookings").select("*").eq("business_id", business.id);
      if (error) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      const matches = (bks || []).filter(
        (b) => b.customer_contact && normalizeWhatsAppNumber(b.customer_contact) === phone
      );
      setBookings(matches);

      const customerId = matches.find((b) => b.customer_id)?.customer_id || null;
      const noteQuery = supabase.from("customer_notes").select("*").eq("business_id", business.id);
      const { data: existingNote } = await (customerId
        ? noteQuery.eq("customer_id", customerId)
        : noteQuery.is("customer_id", null).eq("customer_phone", phone)
      ).maybeSingle();
      if (existingNote) {
        setNoteId(existingNote.id);
        setTag(existingNote.tag || "");
        setNote(existingNote.note || "");
      }
      setLoading(false);
    }
    load();
    // Keyed on business?.id, not the business object itself, so a content-only
    // update to the shared context doesn't retrigger this effect for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardState, business?.id, phone]);

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => visitDate(b).getTime() - visitDate(a).getTime()),
    [bookings]
  );
  const mostRecent = sorted[0];
  const customerId = useMemo(() => bookings.find((b) => b.customer_id)?.customer_id || null, [bookings]);
  const email = useMemo(() => sorted.find((b) => b.customer_email)?.customer_email || null, [sorted]);
  const lifetimeValue = useMemo(
    () => bookings.filter((b) => b.paid).reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [bookings]
  );
  const favoriteService = useMemo(() => mode(bookings.map((b) => b.service).filter(Boolean)), [bookings]);
  const vehicles = useMemo(() => {
    const seen = new Set<string>();
    const list: { make: string; model: string; plate: string }[] = [];
    bookings.forEach((b) => {
      const make = b.vehicle_make || "";
      const model = b.vehicle_model || "";
      const plate = b.vehicle_plate || "";
      if (!make && !model && !plate) return;
      const key = `${make}|${model}|${plate}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ make, model, plate });
    });
    return list;
  }, [bookings]);

  // BUG FIX: this used to upsert with onConflict "business_id,customer_id"
  // (or "...,customer_phone"), but those unique indexes are PARTIAL (WHERE
  // customer_id IS [NOT] NULL), and Postgres can't match a plain ON CONFLICT
  // column list to a partial index — every save failed. Plain update-or-insert
  // against the row we already know about instead.
  async function handleSave() {
    if (!business || !phone) return;
    setSaving(true);
    setSaveError(null);
    const fields = { tag: tag.trim() || null, note: note.trim() || null };
    let error;
    if (noteId) {
      ({ error } = await supabase.from("customer_notes").update(fields).eq("id", noteId));
    } else {
      const res = await supabase
        .from("customer_notes")
        .insert({ business_id: business.id, customer_id: customerId, customer_phone: phone, ...fields })
        .select("id")
        .single();
      error = res.error;
      if (res.data) setNoteId(res.data.id);
    }
    setSaving(false);
    if (error) {
      setSaveError("Couldn't save — please try again.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="bg-canvas2 min-h-screen">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="h-6 w-40 bg-stone-line/60 rounded animate-pulse mb-6" />
          <div className="h-16 w-full bg-stone-line/60 rounded-2xl animate-pulse mb-6" />
          <div className="h-64 bg-white border border-stone-line rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }
  if (guardState === "error") return <BusinessLoadError onRetry={refresh} />;
  if (guardState === "not_business") return <NotBusinessAccount />;
  if (!business || guardState !== "ready") return null;

  if (loadError || bookings.length === 0) {
    return (
      <div className="bg-canvas2 min-h-screen">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">{loadError ? "Couldn't load this customer" : "Customer not found"}</p>
          <p className="text-xs text-stone mt-1.5">{loadError ? "Something went wrong — try refreshing the page." : "No bookings match this phone number."}</p>
          <Link href="/business/customers" className="inline-flex items-center gap-1.5 text-sm text-navy font-medium mt-4">
            <ArrowLeft size={14} /> Back to customers
          </Link>
        </div>
      </div>
    );
  }

  const first = String(mostRecent.customer_name || "").split(" ")[0] || "there";

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/customers" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
          <ArrowLeft size={14} /> Back to customers
        </Link>

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-dim px-6 py-6 sm:px-7 fade-up">
          <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-teal/25 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4 flex-wrap">
            <span className="w-14 h-14 rounded-full bg-white/10 border border-white/15 text-white font-display text-xl font-semibold flex items-center justify-center shrink-0">
              {mostRecent.customer_name?.[0]?.toUpperCase() || "?"}
            </span>
            <div className="flex-1 min-w-[180px]">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">{mostRecent.customer_name}</h1>
              <div className="flex items-center gap-3 flex-wrap text-sm text-white/60 mt-1">
                <span className="flex items-center gap-1"><Phone size={13} /> +{phone}</span>
                {email && <span className="flex items-center gap-1"><Mail size={13} /> {email}</span>}
                {customerId && <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/10 text-white/80 px-2 py-0.5 rounded-full">Luupa account</span>}
              </div>
            </div>
          </div>
          {/* Quick actions — the things you actually do with a customer. */}
          <div className="relative flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => setShowBook(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-white text-navy hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] transition-all"
            >
              <CalendarPlus size={14} /> New booking
            </button>
            <a
              href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${first}, this is ${business.name}. `)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
            <a href={`tel:+${phone}`} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
              <Phone size={14} /> Call
            </a>
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
                <Mail size={14} /> Email
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex sm:grid sm:grid-cols-4 gap-3 mt-6 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible">
          <StatCard icon={<CalendarClock size={14} />} label="Total bookings" value={bookings.length} />
          <StatCard icon={<Wallet size={14} />} label="Lifetime value" value={formatBhd(lifetimeValue)} />
          <StatCard icon={<Sparkles size={14} />} label="Favorite service" value={favoriteService || "—"} />
          <StatCard
            icon={<CalendarClock size={14} />}
            label="Last visit"
            value={visitDate(mostRecent).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
          <div className="space-y-5">
            {/* Vehicle history */}
            <div className="rounded-2xl bg-white border border-stone-line p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-3"><Car size={14} /> Vehicles</p>
              {vehicles.length === 0 ? (
                <p className="text-sm text-stone">No vehicle info on file.</p>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-canvas2 rounded-lg px-3.5 py-2.5">
                      <span className="text-ink font-medium">{[v.make, v.model].filter(Boolean).join(" ") || "Unknown vehicle"}</span>
                      {v.plate && <span className="text-stone text-xs">{v.plate}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booking timeline */}
            <div className="rounded-2xl bg-white border border-stone-line p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-3"><ClipboardList size={14} /> Booking history</p>
              <div className="space-y-2">
                {sorted.map((b) => (
                  <Link
                    key={b.id}
                    href={`/business/bookings?open=${b.id}`}
                    className="flex items-center justify-between gap-3 text-sm bg-canvas2 rounded-lg px-3.5 py-2.5 hover:bg-stone-line/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-ink font-medium truncate">{b.service || "No service specified"}</p>
                      <p className="text-xs text-stone mt-0.5">
                        {visitDate(b).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {b.preferred_time ? ` · ${b.preferred_time}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.paid && b.amount != null && <span className="text-xs font-medium text-ink">{formatBhd(b.amount)}</span>}
                      <BookingStatusBadge status={b.status} />
                      <ChevronRight size={14} className="text-stone" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Tags & notes */}
          <div className="rounded-2xl bg-white border border-stone-line p-5 lg:sticky lg:top-24">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-3"><TagIcon size={14} /> Tag</p>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              maxLength={40}
              placeholder="e.g. VIP, at risk, frequent…"
              className="input"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${tag === t ? "bg-navy border-navy text-white" : "border-stone-line text-ink/70 hover:border-navy/30"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink mt-4 mb-3"><StickyNote size={14} /> Note</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="Anything worth remembering about this customer…"
              className="input h-28 py-2"
            />
            {saveError && <p className="flex items-center gap-1.5 text-sm text-red-600 mt-3"><AlertCircle size={14} /> {saveError}</p>}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl bg-teal text-white shadow-sm hover:bg-teal-dim hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {saved && <span className="flex items-center gap-1 text-sm text-teal-dim"><Check size={14} /> Saved</span>}
            </div>
          </div>
        </div>
      </div>

      {showBook && (
        <ManualBookingForm
          businessId={business.id}
          initialName={mostRecent.customer_name || ""}
          initialContact={phone}
          initialEmail={email || ""}
          onAdded={(b) => setBookings((prev) => [b, ...prev])}
          onClose={() => setShowBook(false)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="shrink-0 w-[150px] sm:w-auto rounded-xl bg-white border border-stone-line px-4 py-3.5">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md mb-1.5 text-navy bg-navy/10">{icon}</span>
      <p className="font-display text-xl font-semibold text-ink leading-tight truncate">{value}</p>
      <p className="text-xs text-stone mt-0.5">{label}</p>
    </div>
  );
}

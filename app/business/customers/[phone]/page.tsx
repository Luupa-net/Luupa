"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import {
  ArrowLeft, Phone, Mail, CalendarClock, Wallet, Sparkles, Car, StickyNote,
  Tag as TagIcon, ClipboardList,
} from "lucide-react";

function visitDate(b: any): Date {
  return new Date(b.preferred_date || b.created_at);
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

// Same status → color mapping used in app/business/bookings/page.tsx's
// StatusChip — kept in sync rather than shared via import so this page
// doesn't reach across into a sibling route's file for a small local piece.
const STATUS_TONES: Record<string, string> = {
  pending: "bg-teal/10 text-teal-dim",
  confirmed: "bg-navy/10 text-navy",
  arrived: "bg-skyblue/10 text-skyblue-dim",
  in_progress: "bg-skyblue/10 text-skyblue-dim",
  completed: "bg-emerald-100 text-emerald-700",
  declined: "bg-stone-line text-stone",
  no_show: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
};

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_TONES[status] || "bg-stone-line text-stone"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ phone: string }>();
  const phone = params.phone;
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tag, setTag] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/account/login");
        return;
      }
      const { data: biz } = await supabase.from("businesses").select("id, name").eq("owner_id", user.id).single();
      if (biz && phone) {
        setBusiness(biz);
        // Fetch every booking for this business, then filter client-side by
        // normalized phone — bookings.customer_id is null for walk-ins, so
        // phone is the only key that works for every booking.
        const { data: bks } = await supabase.from("bookings").select("*").eq("business_id", biz.id);
        const matches = (bks || []).filter(
          (b) => b.customer_contact && normalizeWhatsAppNumber(b.customer_contact) === phone
        );
        setBookings(matches);

        const customerId = matches.find((b) => b.customer_id)?.customer_id || null;
        const noteQuery = supabase.from("customer_notes").select("*").eq("business_id", biz.id);
        const { data: existingNote } = await (customerId
          ? noteQuery.eq("customer_id", customerId)
          : noteQuery.eq("customer_phone", phone)
        ).maybeSingle();
        if (existingNote) {
          setTag(existingNote.tag || "");
          setNote(existingNote.note || "");
        }
      }
      setLoading(false);
    }
    load();
  }, [router, phone]);

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => visitDate(b).getTime() - visitDate(a).getTime()),
    [bookings]
  );
  const mostRecent = sorted[0];
  const customerId = useMemo(() => bookings.find((b) => b.customer_id)?.customer_id || null, [bookings]);
  const email = useMemo(() => sorted.find((b) => b.customer_email)?.customer_email || null, [sorted]);
  // Fallback lifetime value: sums bookings.amount where paid, since that's
  // the only ledger that exists for older bookings today. Once
  // booking_payments has real entries for this customer, a future pass
  // could prefer summing that table's rows instead of this column snapshot.
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

  async function handleSave() {
    if (!business || !phone) return;
    setSaving(true);
    setSaveError(null);
    const payload: Record<string, any> = {
      business_id: business.id,
      customer_phone: phone,
      customer_id: customerId || null,
      tag: tag.trim() || null,
      note: note.trim() || null,
    };
    const { error } = await supabase
      .from("customer_notes")
      .upsert(payload, { onConflict: customerId ? "business_id,customer_id" : "business_id,customer_phone" });
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
  if (!business) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  if (bookings.length === 0) {
    return (
      <div className="bg-canvas2 min-h-screen">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">Customer not found</p>
          <p className="text-xs text-stone mt-1.5">No bookings match this phone number.</p>
          <Link href="/business/customers" className="inline-flex items-center gap-1.5 text-sm text-navy font-medium mt-4">
            <ArrowLeft size={14} /> Back to customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/customers" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
          <ArrowLeft size={14} /> Back to customers
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="w-14 h-14 rounded-full bg-navy/10 text-navy font-display text-xl font-semibold flex items-center justify-center shrink-0">
            {mostRecent.customer_name?.[0]?.toUpperCase() || "?"}
          </span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">{mostRecent.customer_name}</h1>
            <div className="flex items-center gap-3 flex-wrap text-sm text-stone mt-1">
              <span className="flex items-center gap-1"><Phone size={13} /> +{phone}</span>
              {email && <span className="flex items-center gap-1"><Mail size={13} /> {email}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex sm:grid sm:grid-cols-4 gap-3 mt-6 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible">
          <StatCard icon={<CalendarClock size={14} />} label="Total bookings" value={bookings.length} />
          <StatCard icon={<Wallet size={14} />} label="Lifetime value" value={`BHD ${lifetimeValue.toFixed(lifetimeValue % 1 === 0 ? 0 : 2)}`} />
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
                  <div key={b.id} className="flex items-center justify-between gap-3 text-sm bg-canvas2 rounded-lg px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-ink font-medium truncate">{b.service || "No service specified"}</p>
                      <p className="text-xs text-stone mt-0.5">
                        {visitDate(b).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.paid && b.amount != null && <span className="text-xs font-medium text-ink">BHD {b.amount}</span>}
                      <StatusChip status={b.status} />
                    </div>
                  </div>
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
              placeholder="e.g. VIP, at risk, frequent…"
              className="input"
            />
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink mt-4 mb-3"><StickyNote size={14} /> Note</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth remembering about this customer…"
              className="input h-28 py-2"
            />
            {saveError && <p className="text-sm text-red-600 mt-3">{saveError}</p>}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl bg-teal text-white shadow-sm hover:bg-teal-dim hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-150 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {saved && <span className="text-sm text-green-700">Saved</span>}
            </div>
          </div>
        </div>
      </div>
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

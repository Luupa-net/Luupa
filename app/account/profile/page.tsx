"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PhoneInput from "@/components/PhoneInput";
import {
  User, Check, Loader2, CalendarClock, MapPin, Car, ChevronRight,
} from "lucide-react";

type Customer = { id: string; name: string; email: string | null; phone: string | null };
type Booking = {
  id: string;
  business_id: string;
  service: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  created_at: string;
};
type BusinessLite = { id: string; name: string; areas: string[] };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-teal/10 text-teal-dim",
  confirmed: "bg-teal/10 text-teal-dim",
  declined: "bg-red-50 text-red-600",
  arrived: "bg-skyblue/10 text-skyblue-dim",
  in_progress: "bg-skyblue/10 text-skyblue-dim",
  completed: "bg-navy/10 text-navy",
  no_show: "bg-red-50 text-red-600",
  cancelled: "bg-stone-line text-stone",
};

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"profile" | "bookings">(searchParams.get("tab") === "bookings" ? "bookings" : "profile");

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [businesses, setBusinesses] = useState<Record<string, BusinessLite>>({});
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/account/login?next=/account/profile");
        return;
      }
      const { data } = await supabase
        .from("customers")
        .select("id, name, email, phone")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setCustomer(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      }
      setLoading(false);

      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id, business_id, service, preferred_date, preferred_time, status, vehicle_make, vehicle_model, created_at")
        .eq("customer_id", session.user.id)
        .order("created_at", { ascending: false });
      const rows = (bookingRows ?? []) as Booking[];
      setBookings(rows);

      const ids = Array.from(new Set(rows.map((b) => b.business_id)));
      if (ids.length > 0) {
        const { data: bizRows } = await supabase
          .from("businesses_public")
          .select("id, name, areas")
          .in("id", ids);
        const map: Record<string, BusinessLite> = {};
        (bizRows ?? []).forEach((b: any) => { map[b.id] = b; });
        setBusinesses(map);
      }
      setBookingsLoading(false);
    }
    load();
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    const { error } = await supabase
      .from("customers")
      .update({ name, phone })
      .eq("id", customer.id);
    setSavingProfile(false);
    if (error) {
      setProfileError(error.message);
      return;
    }
    setCustomer({ ...customer, name, phone });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("New password should be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (!customer?.email) {
      setPasswordError("No email on file for this account.");
      return;
    }

    setSavingPassword(true);
    // Re-verify identity with the current password before rotating it —
    // an open profile page shouldn't be enough on its own to hijack the
    // account's credentials (e.g. from a shared or unlocked device).
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: customer.email,
      password: currentPassword,
    });
    if (reauthError) {
      setSavingPassword(false);
      setPasswordError("Current password is incorrect.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-24 text-center text-stone">Loading…</div>;
  }
  if (!customer) {
    return <div className="max-w-2xl mx-auto px-6 py-24 text-center text-stone">We couldn't find your account.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
          <User size={20} className="text-teal-dim" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{customer.name}</h1>
          <p className="text-sm text-stone">{customer.email}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-stone-line mb-8">
        {(["profile", "bookings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-teal text-ink" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {t === "profile" ? "My profile" : `My bookings${bookings.length ? ` (${bookings.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Personal information</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-ink">Full name</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Email</span>
                <input disabled value={customer.email ?? ""} className="input mt-1 opacity-60 cursor-not-allowed" />
                <span className="text-xs text-stone mt-1 block">Email can't be changed here — contact support if you need it updated.</span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink mb-1 block">Phone / WhatsApp</span>
                <PhoneInput value={phone} onChange={setPhone} />
              </label>
              {profileError && <p className="text-sm text-red-600">{profileError}</p>}
              <div className="flex items-center gap-3">
                <button
                  disabled={savingProfile}
                  className="px-6 h-11 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {savingProfile && <Loader2 size={15} className="animate-spin" />}
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
                {profileSaved && (
                  <span className="text-sm text-teal-dim flex items-center gap-1"><Check size={15} /> Saved</span>
                )}
              </div>
            </form>
          </section>

          <div className="h-px bg-stone-line" />

          <section>
            <h2 className="font-display text-lg font-semibold text-ink mb-1">Change password</h2>
            <p className="text-sm text-stone mb-4">Enter your current password to set a new one.</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-ink">Current password</span>
                <input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input mt-1" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">New password</span>
                <input required minLength={8} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input mt-1" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Confirm new password</span>
                <input required minLength={8} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input mt-1" />
              </label>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              <div className="flex items-center gap-3">
                <button
                  disabled={savingPassword}
                  className="px-6 h-11 rounded-full bg-navy text-white font-semibold hover:bg-navy-light active:scale-95 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {savingPassword && <Loader2 size={15} className="animate-spin" />}
                  {savingPassword ? "Updating…" : "Update password"}
                </button>
                {passwordSaved && (
                  <span className="text-sm text-teal-dim flex items-center gap-1"><Check size={15} /> Updated</span>
                )}
              </div>
            </form>
          </section>
        </div>
      ) : (
        <div className="space-y-3">
          {bookingsLoading ? (
            <p className="text-stone text-sm py-10 text-center">Loading your bookings…</p>
          ) : bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-line p-10 text-center">
              <p className="text-stone text-sm">You haven't booked anything yet.</p>
              <Link href="/browse" className="text-teal font-medium text-sm mt-1.5 inline-block">
                Browse businesses →
              </Link>
            </div>
          ) : (
            bookings.map((b) => {
              const biz = businesses[b.business_id];
              return (
                <Link
                  key={b.id}
                  href={biz ? `/listing/${b.business_id}` : "#"}
                  className="flex items-center justify-between gap-4 rounded-xl border border-stone-line p-4 hover:border-teal/40 hover:shadow-sm transition-all bg-white"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-ink truncate">{biz?.name ?? "Business"}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[b.status] ?? "bg-stone-line text-stone"}`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-stone mt-0.5 truncate">{b.service || "Service not specified"}</p>
                    <div className="flex items-center gap-3 text-xs text-stone mt-1.5 flex-wrap">
                      {b.preferred_date && (
                        <span className="flex items-center gap-1"><CalendarClock size={12} /> {new Date(b.preferred_date).toLocaleDateString()}{b.preferred_time ? ` · ${b.preferred_time}` : ""}</span>
                      )}
                      {biz?.areas?.[0] && (
                        <span className="flex items-center gap-1"><MapPin size={12} /> {biz.areas[0]}</span>
                      )}
                      {(b.vehicle_make || b.vehicle_model) && (
                        <span className="flex items-center gap-1"><Car size={12} /> {[b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ")}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-stone shrink-0" />
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountProfile() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  );
}

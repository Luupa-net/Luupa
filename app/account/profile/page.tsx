"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PhoneInput from "@/components/PhoneInput";
import PlateInput from "@/components/PlateInput";
import BookingStepper from "@/components/BookingStepper";
import { useRealtimeBookings } from "@/lib/useRealtimeBookings";
import {
  User, Check, Loader2, CalendarClock, MapPin, Car, ChevronRight, Pencil, Trash2,
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
type Vehicle = {
  id: string;
  customer_id: string;
  make: string | null;
  model: string | null;
  plate: string | null;
  nickname: string | null;
  created_at: string;
};

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"profile" | "bookings" | "vehicles">(
    searchParams.get("tab") === "bookings" ? "bookings" : searchParams.get("tab") === "vehicles" ? "vehicles" : "profile"
  );

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

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editPlate, setEditPlate] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [savingVehicleEdit, setSavingVehicleEdit] = useState(false);

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

      const { data: vehicleRows } = await supabase
        .from("vehicles")
        .select("*")
        .eq("customer_id", session.user.id)
        .order("created_at");
      setVehicles((vehicleRows ?? []) as Vehicle[]);
      setVehiclesLoading(false);
    }
    load();
  }, [router]);

  // Live updates from Realtime so a status change made on the business side
  // (or from this same customer on another tab/device) shows up here without
  // a manual refresh. No optimistic-insert path exists on this page today,
  // so INSERT still needs the same "don't duplicate" guard as the business
  // side for consistency/future-proofing, even though nothing here currently
  // creates a booking from this tab itself.
  useRealtimeBookings("customer_id", customer?.id, ({ eventType, new: newRow, old: oldRow }) => {
    if (eventType === "INSERT") {
      setBookings((prev) => (prev.some((b) => b.id === newRow.id) ? prev : [newRow, ...prev]));
    } else if (eventType === "UPDATE") {
      setBookings((prev) => prev.map((b) => (b.id === newRow.id ? newRow : b)));
    } else if (eventType === "DELETE") {
      setBookings((prev) => prev.filter((b) => b.id !== oldRow.id));
    }
  });

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

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setAddingVehicle(true);
    setVehicleError(null);
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        customer_id: customer.id,
        make: newMake || null,
        model: newModel || null,
        plate: newPlate || null,
        nickname: newNickname || null,
      })
      .select()
      .single();
    setAddingVehicle(false);
    if (error) {
      setVehicleError(error.message);
      return;
    }
    setVehicles((prev) => [...prev, data as Vehicle]);
    setNewMake("");
    setNewModel("");
    setNewPlate("");
    setNewNickname("");
  }

  function startEditVehicle(v: Vehicle) {
    setEditingVehicleId(v.id);
    setEditMake(v.make || "");
    setEditModel(v.model || "");
    setEditPlate(v.plate || "");
    setEditNickname(v.nickname || "");
    setVehicleError(null);
  }

  async function handleSaveVehicleEdit(id: string) {
    setSavingVehicleEdit(true);
    setVehicleError(null);
    const { data, error } = await supabase
      .from("vehicles")
      .update({
        make: editMake || null,
        model: editModel || null,
        plate: editPlate || null,
        nickname: editNickname || null,
      })
      .eq("id", id)
      .select()
      .single();
    setSavingVehicleEdit(false);
    if (error) {
      setVehicleError(error.message);
      return;
    }
    setVehicles((prev) => prev.map((v) => (v.id === id ? (data as Vehicle) : v)));
    setEditingVehicleId(null);
  }

  async function handleDeleteVehicle(vehicle: Vehicle) {
    const label = vehicle.nickname || [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "this vehicle";
    if (!window.confirm(`Remove ${label}?`)) return;
    const previous = vehicles;
    setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicle.id);
    if (error) setVehicles(previous);
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
        {(["profile", "bookings", "vehicles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-teal text-ink" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {t === "profile"
              ? "My profile"
              : t === "bookings"
              ? `My bookings${bookings.length ? ` (${bookings.length})` : ""}`
              : `My vehicles${vehicles.length ? ` (${vehicles.length})` : ""}`}
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
      ) : tab === "bookings" ? (
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
                    <p className="font-medium text-ink truncate">{biz?.name ?? "Business"}</p>
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
                    {/* BookingStepper hardcodes white text/translucent fills — it
                        was designed to sit on the navy gradient drawer header
                        (see BookingDrawer.tsx's bg-white/5 wrapper), not on a
                        plain white card. Reusing that same dark-background
                        treatment here so labels stay legible, without touching
                        the component itself. It also still renders at drawer
                        width/scale — a bit dense/tight for this compact list
                        row — but no size variant exists on it yet and it's used
                        unchanged elsewhere, so left as-is rather than risking
                        that other usage. */}
                    <div className="mt-2 rounded-lg bg-navy px-3 py-2.5">
                      <BookingStepper status={b.status} />
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-stone shrink-0" />
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Add a vehicle</h2>
            <form onSubmit={handleAddVehicle} className="space-y-2.5 max-w-md">
              <div className="grid grid-cols-2 gap-2.5">
                <input placeholder="Make" value={newMake} onChange={(e) => setNewMake(e.target.value)} className="input" />
                <input placeholder="Model" value={newModel} onChange={(e) => setNewModel(e.target.value)} className="input" />
              </div>
              <PlateInput value={newPlate} onChange={setNewPlate} />
              <input
                placeholder='Nickname (optional, e.g. "My car")'
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="input"
              />
              {vehicleError && !editingVehicleId && <p className="text-sm text-red-600">{vehicleError}</p>}
              <button
                disabled={addingVehicle}
                className="px-6 h-11 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {addingVehicle && <Loader2 size={15} className="animate-spin" />}
                {addingVehicle ? "Adding…" : "Add vehicle"}
              </button>
            </form>
          </section>

          <div className="h-px bg-stone-line" />

          <section>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Saved vehicles</h2>
            {vehiclesLoading ? (
              <p className="text-stone text-sm py-10 text-center">Loading your vehicles…</p>
            ) : vehicles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-line p-10 text-center">
                <p className="text-stone text-sm">No saved vehicles yet — add one so it's ready to pick next time you book.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((v) =>
                  editingVehicleId === v.id ? (
                    <div key={v.id} className="rounded-xl border border-stone-line p-4 bg-white space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <input placeholder="Make" value={editMake} onChange={(e) => setEditMake(e.target.value)} className="input" />
                        <input placeholder="Model" value={editModel} onChange={(e) => setEditModel(e.target.value)} className="input" />
                      </div>
                      <PlateInput value={editPlate} onChange={setEditPlate} />
                      <input
                        placeholder="Nickname (optional)"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="input"
                      />
                      {vehicleError && <p className="text-sm text-red-600">{vehicleError}</p>}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSaveVehicleEdit(v.id)}
                          disabled={savingVehicleEdit}
                          className="px-5 h-9 rounded-full bg-teal text-white text-sm font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60 flex items-center gap-2"
                        >
                          {savingVehicleEdit && <Loader2 size={14} className="animate-spin" />}
                          {savingVehicleEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingVehicleId(null); setVehicleError(null); }}
                          className="text-sm text-stone hover:text-ink transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={v.id} className="flex items-center justify-between gap-4 rounded-xl border border-stone-line p-4 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                          <Car size={16} className="text-teal-dim" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">
                            {v.nickname ? `${v.nickname} — ` : ""}
                            {[v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}
                          </p>
                          <p className="text-sm text-stone mt-0.5 truncate">{v.plate || "No plate on file"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditVehicle(v)}
                          aria-label="Edit vehicle"
                          className="text-stone hover:text-ink transition-colors p-1.5"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVehicle(v)}
                          aria-label="Remove vehicle"
                          className="text-stone hover:text-red-600 transition-colors p-1.5"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
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

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarPlus, Check, X, Loader2 } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import PlateInput from "@/components/PlateInput";

type Customer = { id: string; name: string; email: string | null; phone: string | null };
type Vehicle = {
  id: string;
  customer_id: string;
  make: string | null;
  model: string | null;
  plate: string | null;
  nickname: string | null;
};

// Sentinel option value for "enter a different vehicle" in the saved-vehicle
// picker — distinct from any real vehicle id.
const MANUAL_VEHICLE = "manual";

export default function BookingForm({
  businessId,
  services,
}: {
  businessId: string;
  services?: { name: string; price?: string }[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(MANUAL_VEHICLE);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  // "Complete your profile" step — covers a brand-new signup whose profile
  // insert failed, and a business owner's own account booking as a customer
  // for the first time (same auth.users pool, no customers row yet).
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [service, setService] = useState(services?.[0]?.name || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  async function loadSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUserId(null);
      setCustomer(null);
      setVehicles([]);
      setSelectedVehicleId(MANUAL_VEHICLE);
      setChecking(false);
      return;
    }
    setUserId(session.user.id);
    setProfileEmail(session.user.email || "");
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("id", session.user.id)
      .single();
    setCustomer(data ?? null);

    if (data) {
      const { data: vehicleRows } = await supabase
        .from("vehicles")
        .select("*")
        .eq("customer_id", data.id);
      const rows = (vehicleRows ?? []) as Vehicle[];
      setVehicles(rows);
      // Default to the first saved vehicle so it's one click to book —
      // "Enter a different vehicle" (MANUAL_VEHICLE) falls back to free text.
      setSelectedVehicleId(rows.length > 0 ? rows[0].id : MANUAL_VEHICLE);
    } else {
      setVehicles([]);
      setSelectedVehicleId(MANUAL_VEHICLE);
    }
    setChecking(false);
  }

  useEffect(() => {
    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => loadSession());
    // Coming back from /account/login or /account/signup with ?book=1 reopens
    // this modal automatically, so the customer doesn't have to click Book again.
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") === "1") setModalOpen(true);
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    setProfileError(null);
    const { data, error } = await supabase
      .from("customers")
      .insert({ id: userId, name: profileName, email: profileEmail, phone: profilePhone })
      .select("id, name, email, phone")
      .single();
    setSavingProfile(false);
    if (error) {
      setProfileError(error.message);
      return;
    }
    setCustomer(data);
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setSending(true);
    setBookingError(null);

    // A saved vehicle is "active" only when the picker is shown (>=1 saved)
    // and the customer hasn't chosen to enter a different one — otherwise
    // fall back to whatever's in the free-text fields, same as before.
    const savedVehicle =
      vehicles.length > 0 && selectedVehicleId !== MANUAL_VEHICLE
        ? vehicles.find((v) => v.id === selectedVehicleId)
        : undefined;

    const { error } = await supabase.from("bookings").insert({
      business_id: businessId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_contact: customer.phone,
      customer_email: customer.email,
      service: service || null,
      preferred_date: date || null,
      preferred_time: time || null,
      vehicle_make: savedVehicle ? savedVehicle.make : (vehicleMake || null),
      vehicle_model: savedVehicle ? savedVehicle.model : (vehicleModel || null),
      vehicle_plate: savedVehicle ? savedVehicle.plate : (vehiclePlate || null),
      note,
      source: "luupa",
      status: "pending",
    });
    setSending(false);
    if (error) {
      setBookingError(error.message);
      return;
    }
    setSent(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSent(false);
    setBookingError(null);
  }

  const loginNext = encodeURIComponent(`/listing/${businessId}?book=1`);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors"
      >
        <CalendarPlus size={16} /> Book
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-ink">Book an appointment</h3>
              <button onClick={closeModal} aria-label="Close"><X size={18} className="text-stone" /></button>
            </div>

            {checking && (
              <div className="py-10 flex justify-center">
                <Loader2 size={22} className="animate-spin text-stone" />
              </div>
            )}

            {!checking && !userId && (
              <div>
                <p className="text-sm text-stone mb-5">
                  Create a free Luupa account (or sign in) to book — so you're not retyping your name and number for every business.
                </p>
                <div className="space-y-2.5">
                  <a
                    href={`/account/signup?next=${loginNext}`}
                    className="block w-full text-center h-11 leading-[44px] rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors"
                  >
                    Create account
                  </a>
                  <a
                    href={`/account/login?next=${loginNext}`}
                    className="block w-full text-center h-11 leading-[44px] rounded-lg border border-stone-line text-ink font-medium hover:bg-canvas2 transition-colors"
                  >
                    Sign in
                  </a>
                </div>
              </div>
            )}

            {!checking && userId && !customer && (
              <form onSubmit={handleCreateProfile} className="space-y-2.5">
                <p className="text-sm text-stone mb-2">Just a few details before you book.</p>
                <input required placeholder="Your name" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="input" />
                <input required type="email" placeholder="Email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="input" />
                <PhoneInput value={profilePhone} onChange={setProfilePhone} placeholder="Phone or WhatsApp" />
                {profileError && <p className="text-sm text-red-600">{profileError}</p>}
                <button disabled={savingProfile} className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60">
                  {savingProfile ? "Saving…" : "Continue"}
                </button>
              </form>
            )}

            {!checking && userId && customer && !sent && (
              <form onSubmit={handleSubmitBooking} className="space-y-2.5">
                <div className="flex items-center justify-between bg-canvas2 rounded-lg px-3.5 py-2.5 text-sm">
                  <span className="text-ink">Booking as <b>{customer.name}</b></span>
                </div>

                {services && services.length > 0 ? (
                  <select value={service} onChange={(e) => setService(e.target.value)} className="input">
                    {services.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="What service do you need?"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="input"
                  />
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
                </div>

                {vehicles.length > 0 && (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="input"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nickname ? `${v.nickname} — ` : ""}
                        {[v.make, v.model].filter(Boolean).join(" ")}
                        {v.plate ? ` (${v.plate})` : ""}
                      </option>
                    ))}
                    <option value={MANUAL_VEHICLE}>Enter a different vehicle</option>
                  </select>
                )}

                {(vehicles.length === 0 || selectedVehicleId === MANUAL_VEHICLE) && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input placeholder="Vehicle make" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className="input" />
                      <input placeholder="Vehicle model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="input" />
                    </div>
                    <PlateInput value={vehiclePlate} onChange={setVehiclePlate} />
                  </>
                )}

                <textarea
                  placeholder="Anything else? (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input h-16 py-2"
                />
                <p className="text-xs text-stone">This is a request — the business will confirm with you directly, it's not automatically booked yet.</p>
                {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}
                <button
                  disabled={sending}
                  className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send request"}
                </button>
              </form>
            )}

            {sent && (
              <div className="flex items-center gap-2 text-sm text-teal-dim bg-teal/5 rounded-lg px-4 py-3">
                <Check size={15} /> Request sent — they'll confirm with you directly.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

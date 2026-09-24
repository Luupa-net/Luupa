"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/lib/BusinessContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhoneInput from "@/components/PhoneInput";
import { ArrowLeft, Plus, X, Trash2, KeyRound } from "lucide-react";

type Staff = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  role: string | null;
  national_id: string | null;
  active: boolean;
  auth_user_id: string | null;
  created_at: string;
};

export default function StaffPage() {
  const { business, role, checked } = useBusiness();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pinTarget, setPinTarget] = useState<Staff | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!checked) return;
    if (!business) {
      router.push("/account/login");
      return;
    }
    // Staff management is owner/manager only — a staff session that lands
    // here directly (typed URL, old bookmark) gets bounced to their own
    // dashboard, not shown a stripped-down version of this page.
    if (role === "staff") {
      router.push("/business/bookings");
      return;
    }
    async function load() {
      const { data: rows, error } = await supabase.from("staff").select("*").eq("business_id", business.id).order("created_at");
      setLoadError(!!error);
      setStaff(rows || []);
      setLoading(false);
    }
    load();
    // Keyed on business?.id, not the business object itself, so a content-only
    // update to the shared context doesn't retrigger this effect for nothing.
  }, [checked, business?.id, role, router]);

  async function toggleActive(member: Staff) {
    const next = !member.active;
    setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, active: next } : s)));
    const { error } = await supabase.from("staff").update({ active: next }).eq("id", member.id);
    if (error) {
      setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, active: member.active } : s)));
    }
  }

  async function removeStaff(member: Staff) {
    if (!window.confirm(`Remove ${member.name} from your staff?`)) return;
    const previous = staff;
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
    const { error } = await supabase.from("staff").delete().eq("id", member.id);
    if (error) setStaff(previous);
  }

  if (loading) {
    return (
      <div className="bg-canvas2 min-h-screen">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="h-6 w-40 bg-stone-line/60 rounded animate-pulse mb-6" />
          <div className="h-9 w-56 bg-stone-line/60 rounded animate-pulse mb-6" />
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-white border border-stone-line rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!business) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Staff</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-navy text-white shadow-sm hover:bg-navy-light hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150"
          >
            <Plus size={15} /> Add staff
          </button>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-stone-line shadow-sm overflow-hidden">
          {loadError ? (
            <p className="text-sm text-red-600 text-center py-16 px-8">
              Couldn't load your staff — try refreshing the page.
            </p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-stone text-center py-16 px-8">
              No staff added yet — add your team so you can assign bookings to them.
            </p>
          ) : (
            <div className="divide-y divide-stone-line">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-stone uppercase tracking-wide">
                <span className="w-9" />
                <span className="flex-1 min-w-0">Name</span>
                <span className="w-32 shrink-0">Role</span>
                <span className="w-36 shrink-0">Phone</span>
                <span className="w-28 shrink-0">Login</span>
                <span className="w-20 text-right shrink-0">Active</span>
                <span className="w-9 shrink-0" />
              </div>
              {staff.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="w-9 h-9 rounded-full bg-navy/10 text-navy font-semibold text-xs flex items-center justify-center shrink-0">
                    {s.name?.[0]?.toUpperCase() || "?"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-ink text-sm truncate">{s.name}</span>
                    <span className="block text-xs text-stone mt-0.5 sm:hidden truncate">
                      {s.role || "—"}{s.phone ? ` · +${s.phone}` : ""}
                    </span>
                    {s.national_id && (
                      <span className="block text-xs text-stone/70 mt-0.5 truncate">CPR {s.national_id}</span>
                    )}
                  </span>
                  <span className="hidden sm:block w-32 shrink-0 text-sm text-ink truncate">{s.role || "—"}</span>
                  <span className="hidden sm:block w-36 shrink-0 text-sm text-stone truncate">{s.phone ? `+${s.phone}` : "—"}</span>
                  <span className="w-28 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPinTarget(s)}
                      disabled={!s.phone}
                      title={!s.phone ? "Add a phone number first" : s.auth_user_id ? "Reset login PIN" : "Set up login PIN"}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        s.auth_user_id ? "border-stone-line text-stone hover:text-ink hover:border-navy/30" : "border-teal/30 text-teal-dim hover:bg-teal/5"
                      }`}
                    >
                      <KeyRound size={12} /> {s.auth_user_id ? "Reset PIN" : "Set up login"}
                    </button>
                  </span>
                  <span className="w-20 flex justify-end shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.active}
                      aria-label={s.active ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                      onClick={() => toggleActive(s)}
                      className={`relative w-10 h-6 rounded-full transition-colors duration-150 ${s.active ? "bg-teal" : "bg-stone-line"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                          s.active ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </span>
                  <span className="w-9 flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => removeStaff(s)}
                      aria-label={`Remove ${s.name}`}
                      className="text-stone hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <AddStaffModal
          businessId={business.id}
          onAdded={(row) => setStaff((prev) => [...prev, row])}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {pinTarget && (
        <StaffPinModal
          staff={pinTarget}
          onSet={(authUserId) => {
            setStaff((prev) => prev.map((s) => (s.id === pinTarget.id ? { ...s, auth_user_id: authUserId } : s)));
          }}
          onClose={() => setPinTarget(null)}
        />
      )}
    </div>
  );
}

function StaffPinModal({
  staff,
  onSet,
  onClose,
}: {
  staff: Staff;
  onSet: (authUserId: string) => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN must be 4-6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/business/staff-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ staffId: staff.id, pin }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Couldn't set that PIN — try again.");
        setSaving(false);
        return;
      }
      setDone(true);
      onSet(result.authUserId);
    } catch {
      setError("Couldn't reach the server — try again.");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">
            {staff.auth_user_id ? "Reset" : "Set up"} login PIN
          </h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone" /></button>
        </div>

        {done ? (
          <div className="text-sm text-ink space-y-3">
            <p>
              <span className="font-medium">{staff.name}</span> can now sign in at{" "}
              <span className="font-mono text-teal-dim">/staff/login</span> with their phone number and this PIN.
            </p>
            <p className="text-xs text-stone">Share the PIN with them directly — it isn't sent anywhere automatically.</p>
            <button onClick={onClose} className="w-full h-11 rounded-lg bg-navy text-white font-medium hover:bg-navy-light transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <p className="text-sm text-stone mb-2">
              {staff.name} will sign in with <span className="font-medium text-ink">+{staff.phone}</span> and this PIN.
            </p>
            <input
              type="password"
              inputMode="numeric"
              placeholder="4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input text-center tracking-[0.4em] font-mono"
              autoFocus
            />
            <input
              type="password"
              inputMode="numeric"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input text-center tracking-[0.4em] font-mono"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={saving}
              className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : staff.auth_user_id ? "Reset PIN" : "Set up login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AddStaffModal({
  businessId,
  onAdded,
  onClose,
}: {
  businessId: string;
  onAdded: (staff: Staff) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("staff")
      .insert({
        business_id: businessId,
        name,
        role: role || null,
        phone: phone || null,
        national_id: nationalId || null,
        active: true,
      })
      .select()
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message || "Couldn't add that staff member — try again.");
      return;
    }
    onAdded(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">Add staff</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone" /></button>
        </div>
        <p className="text-sm text-stone mb-4">Add a team member so you can assign bookings to them.</p>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
          <input placeholder="Role (e.g. Detailer, Washer)" value={role} onChange={(e) => setRole(e.target.value)} className="input" />
          <div>
            <PhoneInput value={phone} onChange={setPhone} placeholder="Phone number" />
            <p className="text-xs text-stone mt-1.5">
              Needed if this staff member will sign in — required to set up their login PIN.
            </p>
          </div>
          <input
            placeholder="National ID / CPR (optional)"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            className="input"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={saving || !name.trim()}
            className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add staff"}
          </button>
        </form>
      </div>
    </div>
  );
}

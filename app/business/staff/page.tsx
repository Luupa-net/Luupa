"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/lib/BusinessContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhoneInput from "@/components/PhoneInput";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { ArrowLeft, Plus, X, Trash2, KeyRound, Pencil, Loader2, Check, Users } from "lucide-react";

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
  last_login_at: string | null;
  failed_pin_attempts: number;
  locked_until: string | null;
};

function isLocked(s: Staff): boolean {
  return !!s.locked_until && new Date(s.locked_until) > new Date();
}

export default function StaffPage() {
  const { business, role, checked } = useBusiness();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pinTarget, setPinTarget] = useState<Staff | null>(null);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
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

  useEffect(() => {
    if (staff.length === 0 || !business) return;
    let cancelled = false;
    // One count query per staff member, in parallel — staff rosters here are
    // small (a handful of people per business), so this is simpler than
    // standing up a view/RPC just to group-count bookings server-side.
    Promise.all(
      staff.map((s) =>
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("assigned_staff_id", s.id)
          .then(({ count }) => [s.id, count ?? 0] as const)
      )
    ).then((entries) => {
      if (!cancelled) setBookingCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [staff, business?.id]);

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
          <div className="h-32 bg-stone-line/60 rounded-2xl animate-pulse mb-6" />
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

  const activeCount = staff.filter((s) => s.active).length;

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4 w-fit">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-dim px-6 py-7 sm:px-8 sm:py-9 mb-6 fade-up">
          <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-teal/25 blur-3xl drift-slow pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 w-52 h-52 rounded-full bg-white/5 blur-3xl drift-slow-reverse pointer-events-none" />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-white">
                <Users size={24} />
              </span>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">Staff</h1>
                <p className="text-sm text-white/55">Your team and their access</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-white text-navy shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150"
            >
              <Plus size={15} /> Add staff
            </button>
          </div>
          <div className="relative flex gap-3 mt-6">
            <div className="rounded-xl bg-white/10 px-4 py-3 min-w-[92px]">
              <p className="font-display text-2xl font-semibold text-white leading-tight">{staff.length}</p>
              <p className="text-xs text-white/55 mt-0.5">Total staff</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 min-w-[92px]">
              <p className="font-display text-2xl font-semibold text-white leading-tight">{activeCount}</p>
              <p className="text-xs text-white/55 mt-0.5">Active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
            <Users size={15} className="text-teal-dim" />
          </span>
          <h2 className="font-display text-lg font-semibold text-ink">Team members</h2>
        </div>

        <div className="bg-white rounded-2xl border border-stone-line shadow-sm overflow-hidden">
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
                <span className="w-16 shrink-0" />
              </div>
              {staff.map((s) => {
                const metaParts = [
                  s.national_id && `CPR ${s.national_id}`,
                  `${bookingCounts[s.id] ?? "…"} bookings`,
                  `Active ${formatRelativeTime(s.last_login_at)}`,
                ].filter(Boolean);
                return (
                  // flex-col on mobile (name on its own line, controls on a
                  // second line below) — the old single fixed-width row ran
                  // out of horizontal space once the edit button was added,
                  // squeezing the name to a sliver at narrow widths.
                  // sm:contents below flattens the controls back into one
                  // row alongside Role/Phone once there's room for it.
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-navy/10 text-navy font-semibold text-xs flex items-center justify-center shrink-0">
                      {s.name?.[0]?.toUpperCase() || "?"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-ink text-sm truncate">{s.name}</span>
                        {isLocked(s) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
                            Locked
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-stone mt-0.5 sm:hidden truncate">
                        {s.role || "—"}{s.phone ? ` · +${s.phone}` : ""}
                      </span>
                      <span className="block text-xs text-stone/70 mt-0.5 truncate">{metaParts.join(" · ")}</span>
                    </span>
                  </div>
                    <span className="hidden sm:block w-32 shrink-0 text-sm text-ink truncate">{s.role || "—"}</span>
                    <span className="hidden sm:block w-36 shrink-0 text-sm text-stone truncate">{s.phone ? `+${s.phone}` : "—"}</span>
                  {/* Row 2 on mobile (indented to align under the name);
                      sm:contents dissolves this wrapper at sm+ so its three
                      children rejoin the row above as ordinary columns. */}
                  <div className="flex items-center gap-3 pl-12 sm:pl-0 sm:contents">
                    <span className="shrink-0 sm:w-28">
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
                    <span className="shrink-0 sm:w-20 flex sm:justify-end">
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
                    <span className="ml-auto sm:ml-0 shrink-0 sm:w-16 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTarget(s)}
                        aria-label={`Edit ${s.name}`}
                        className="text-stone hover:text-navy transition-colors p-1"
                      >
                        <Pencil size={15} />
                      </button>
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
                  </div>
                );
              })}
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

      {editTarget && (
        <EditStaffModal
          staff={editTarget}
          onUpdated={(updated) => {
            setStaff((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          }}
          onClose={() => setEditTarget(null)}
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
    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must be 6 digits.");
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
              placeholder="6-digit PIN"
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
              className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
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
        // Normalized the same way the PIN-setup route normalizes it when
        // creating the Auth user, so staff.phone and auth.users.phone can
        // never drift apart later — see app/api/staff-login/route.ts.
        phone: phone ? normalizeWhatsAppNumber(phone) : null,
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
            className="w-full h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Adding…" : "Add staff"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditStaffModal({
  staff,
  onUpdated,
  onClose,
}: {
  staff: Staff;
  onUpdated: (staff: Staff) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(staff.name);
  const [role, setRole] = useState(staff.role || "");
  const [phone, setPhone] = useState(staff.phone || "");
  const [nationalId, setNationalId] = useState(staff.national_id || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch("/api/business/staff-update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ staffId: staff.id, name, role, phone, nationalId }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Couldn't save those changes — try again.");
        setSaving(false);
        return;
      }
      setSaved(true);
      onUpdated(result.staff);
      setTimeout(onClose, 900);
    } catch {
      setError("Couldn't reach the server — try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">Edit staff</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="input" />
          <input placeholder="Role (e.g. Detailer, Washer)" value={role} onChange={(e) => setRole(e.target.value)} className="input" />
          <div>
            <PhoneInput value={phone} onChange={setPhone} placeholder="Phone number" />
            {staff.auth_user_id && (
              <p className="text-xs text-stone mt-1.5">
                {staff.name} already has a login PIN — changing this number updates their sign-in phone too.
              </p>
            )}
          </div>
          <input
            placeholder="National ID / CPR (optional)"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            className="input"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              disabled={saving || !name.trim()}
              className="flex-1 h-11 rounded-lg bg-teal text-white font-medium hover:bg-teal-dim transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span className="text-sm text-teal-dim flex items-center gap-1 shrink-0"><Check size={15} /> Saved</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

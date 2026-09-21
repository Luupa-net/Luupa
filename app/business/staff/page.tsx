"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhoneInput from "@/components/PhoneInput";
import { ArrowLeft, Plus, X, Trash2 } from "lucide-react";

type Staff = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  role: string | null;
  active: boolean;
  created_at: string;
};

export default function StaffPage() {
  const [business, setBusiness] = useState<any>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/business/login");
        return;
      }
      const { data: biz } = await supabase.from("businesses").select("id, name").eq("owner_id", user.id).single();
      if (biz) {
        setBusiness(biz);
        const { data: rows } = await supabase.from("staff").select("*").eq("business_id", biz.id).order("created_at");
        setStaff(rows || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

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
          {staff.length === 0 ? (
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
                  </span>
                  <span className="hidden sm:block w-32 shrink-0 text-sm text-ink truncate">{s.role || "—"}</span>
                  <span className="hidden sm:block w-36 shrink-0 text-sm text-stone truncate">{s.phone ? `+${s.phone}` : "—"}</span>
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
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("staff")
      .insert({
        business_id: businessId,
        name,
        role: role || null,
        phone: phone || null,
        active: true,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      onAdded(data);
      onClose();
    }
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
          <PhoneInput value={phone} onChange={setPhone} placeholder="Phone (optional)" />
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

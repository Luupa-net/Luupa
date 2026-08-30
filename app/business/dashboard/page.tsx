"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ServicesEditor from "@/components/ServicesEditor";
import PhotoUploader from "@/components/PhotoUploader";
import { Clock, CheckCircle2, XCircle, Eye } from "lucide-react";

const SUBCATEGORIES = [
  "Detailing", "Window Tinting", "Ceramic Coating & PPF", "Car Wash",
  "Wraps & Vinyl", "Paint Correction", "Engine Detailing", "Mobile Detailing",
];
const AREAS = ["Manama", "Riffa", "Muharraq", "Isa Town", "Hamad Town"];

const EDITABLE_FIELDS = [
  "name", "subcategory", "area", "phone", "whatsapp", "hours",
  "description", "services", "photos", "cr_number", "social_link", "applicant_note",
] as const;

export default function Dashboard() {
  const [listing, setListing] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/business/login");
        return;
      }
      const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).single();
      setListing(data);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Only send fields a business is actually allowed to edit — status, verified,
    // and tier are admin-controlled and enforced at the database level regardless.
    const payload: Record<string, any> = {};
    EDITABLE_FIELDS.forEach((f) => { payload[f] = listing[f]; });

    await supabase.from("businesses").update(payload).eq("id", listing.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-16 text-stone">Loading…</div>;
  if (!listing) return <div className="max-w-3xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Your listing</h1>
        <button onClick={handleLogout} className="text-sm text-stone hover:text-ink">Log out</button>
      </div>

      <StatusBanner status={listing.status} viewCount={listing.view_count ?? 0} />

      <form onSubmit={handleSave} className="mt-8 space-y-8">
        {/* Details */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Details</h2>
          <Field label="Business name">
            <input className="input" value={listing.name || ""} onChange={(e) => setListing({ ...listing, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service">
              <select className="input" value={listing.subcategory || SUBCATEGORIES[0]} onChange={(e) => setListing({ ...listing, subcategory: e.target.value })}>
                {SUBCATEGORIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Area">
              <select className="input" value={listing.area || AREAS[0]} onChange={(e) => setListing({ ...listing, area: e.target.value })}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input className="input" value={listing.phone || ""} onChange={(e) => setListing({ ...listing, phone: e.target.value })} />
            </Field>
            <Field label="WhatsApp" hint="With country code, no +">
              <input className="input" value={listing.whatsapp || ""} onChange={(e) => setListing({ ...listing, whatsapp: e.target.value })} />
            </Field>
          </div>
          <Field label="Hours">
            <input className="input" value={listing.hours || ""} onChange={(e) => setListing({ ...listing, hours: e.target.value })} />
          </Field>
          <Field label="Description" hint="Shown to customers, used for search matching">
            <textarea className="input h-28 py-2" value={listing.description || ""} onChange={(e) => setListing({ ...listing, description: e.target.value })} />
          </Field>
        </section>

        {/* Photos */}
        <section>
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Photos</h2>
          <PhotoUploader
            businessId={listing.id}
            ownerId={listing.owner_id}
            photos={listing.photos || []}
            onChange={(photos) => setListing({ ...listing, photos })}
          />
        </section>

        {/* Services */}
        <section>
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Services</h2>
          <ServicesEditor
            services={listing.services || []}
            onChange={(services) => setListing({ ...listing, services })}
          />
        </section>

        {/* Verification */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Verification info</h2>
          <Field label="CR / trade license number">
            <input className="input" value={listing.cr_number || ""} onChange={(e) => setListing({ ...listing, cr_number: e.target.value })} />
          </Field>
          <Field label="Instagram or website">
            <input className="input" value={listing.social_link || ""} onChange={(e) => setListing({ ...listing, social_link: e.target.value })} />
          </Field>
        </section>

        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-terra text-white font-semibold hover:bg-terra-dim active:scale-95 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-green-700">Saved</span>}
        </div>
      </form>
    </div>
  );
}

function StatusBanner({ status, viewCount }: { status: string; viewCount: number }) {
  const config = {
    pending: {
      icon: <Clock size={18} className="text-terra-dim" />,
      bg: "bg-terra/10",
      text: "Under review — we manually check every new listing before it goes live, usually within a day or two.",
    },
    active: {
      icon: <CheckCircle2 size={18} className="text-navy" />,
      bg: "bg-navy/10",
      text: "Live — customers can find and contact you right now.",
    },
    suspended: {
      icon: <XCircle size={18} className="text-red-600" />,
      bg: "bg-red-50",
      text: "Suspended — reach out to hello@luupa.net if you think this is a mistake.",
    },
  }[status] ?? { icon: null, bg: "bg-stone-line", text: status };

  return (
    <div className={`mt-4 rounded-xl px-4 py-3.5 flex items-start gap-3 ${config.bg}`}>
      {config.icon}
      <p className="text-sm text-ink flex-1">{config.text}</p>
      {status === "active" && (
        <span className="flex items-center gap-1 text-xs text-stone shrink-0">
          <Eye size={13} /> {viewCount} views
        </span>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint && <span className="block text-xs text-stone mt-0.5">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

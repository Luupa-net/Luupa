"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBCATEGORIES, AREAS } from "@/lib/taxonomy";
import { computeCompleteness } from "@/lib/completeness";
import { isEffectivelyVerified } from "@/lib/verification";
import ServicesEditor from "@/components/ServicesEditor";
import PhotoUploader from "@/components/PhotoUploader";
import LogoUploader from "@/components/LogoUploader";
import {
  Clock, CheckCircle2, XCircle, Eye, BadgeCheck, ImageIcon, Wrench,
  ShieldCheck, ExternalLink, TrendingUp,
} from "lucide-react";

const EDITABLE_FIELDS = [
  "name", "logo_url", "subcategories", "areas", "phone", "whatsapp", "hours",
  "description", "services", "photos", "cr_number", "social_link", "applicant_note",
] as const;

const TABS = ["Profile", "Photos", "Services", "Verification"] as const;

export default function Dashboard() {
  const [listing, setListing] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/business/login");
        return;
      }
      const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).single();
      setListing(data ? { ...data, subcategories: data.subcategories || [], areas: data.areas || [] } : null);
      setLoading(false);
    }
    load();
  }, [router]);

  function toggle(key: "subcategories" | "areas", value: string) {
    const current: string[] = listing[key] || [];
    setListing({
      ...listing,
      [key]: current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value],
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
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

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">Loading…</div>;
  if (!listing) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  const { percent, items } = computeCompleteness(listing);
  const verified = isEffectivelyVerified(listing);
  const missing = items.filter((i) => !i.done);
  const suspended = listing.status === "suspended";
  const daysSinceApplied = Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header — identity + big, unmissable status */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-canvas2 border border-stone-line overflow-hidden flex items-center justify-center shrink-0">
            {listing.logo_url ? (
              <img src={listing.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-navy font-display text-xl font-semibold">{listing.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">{listing.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={listing.status} />
              {verified && (
                <span className="flex items-center gap-1 text-xs font-semibold text-white bg-navy px-2.5 py-1 rounded-full">
                  <BadgeCheck size={13} /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {listing.status === "active" && (
            <Link href={`/listing/${listing.id}`} target="_blank" className="flex items-center gap-1.5 text-sm font-medium text-navy">
              View live <ExternalLink size={13} />
            </Link>
          )}
          <button onClick={handleLogout} className="text-sm text-stone hover:text-ink">Log out</button>
        </div>
      </div>

      {suspended && (
        <div className="mt-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3">
          <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Your listing is suspended</p>
            <p className="text-sm text-red-600/80 mt-0.5">
              It's not visible to customers right now. If you think this is a mistake, contact{" "}
              <a href="mailto:hello@luupa.net" className="underline">hello@luupa.net</a>.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
        <StatCard icon={<Eye size={16} />} label="Profile views" value={listing.view_count ?? 0} />
        <StatCard icon={<TrendingUp size={16} />} label="Completeness" value={`${percent}%`} />
        <StatCard icon={<Wrench size={16} />} label="Services listed" value={(listing.services || []).length} />
        <StatCard icon={<ImageIcon size={16} />} label="Photos added" value={(listing.photos || []).length} />
      </div>

      {/* Completeness nudge */}
      {percent < 100 && (
        <div className="mt-4 rounded-xl bg-terra/5 border border-terra/15 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink">Complete your profile to build more trust</p>
            <span className="text-xs text-terra-dim font-medium">{percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white overflow-hidden">
            <div className="h-full bg-terra transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-stone mt-2.5">
            Still to do: {missing.slice(0, 3).map((m) => m.label).join(" · ")}
            {missing.length > 3 ? ` +${missing.length - 3} more` : ""}
          </p>
        </div>
      )}

      <p className="text-xs text-stone mt-4">
        Applied {daysSinceApplied === 0 ? "today" : `${daysSinceApplied} day${daysSinceApplied === 1 ? "" : "s"} ago`}
        {" · "}{new Date(listing.created_at).toLocaleDateString()}
      </p>

      {/* Tabs */}
      <div className="flex gap-1.5 mt-8 border-b border-stone-line overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t ? "border-terra text-ink" : "border-transparent text-stone hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <fieldset disabled={suspended} className={suspended ? "opacity-50 pointer-events-none" : ""}>
        <form onSubmit={handleSave} className="mt-6">
          {tab === "Profile" && (
            <div className="space-y-5">
              <LogoUploader
                ownerId={listing.owner_id}
                logoUrl={listing.logo_url}
                onChange={(logo_url) => setListing({ ...listing, logo_url })}
              />
              <Field label="Business name">
                <input className="input" value={listing.name || ""} onChange={(e) => setListing({ ...listing, name: e.target.value })} />
              </Field>
              <div>
                <span className="text-sm font-medium text-ink">Services you offer</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUBCATEGORIES.map((s) => (
                    <Chip key={s} label={s} active={listing.subcategories.includes(s)} onClick={() => toggle("subcategories", s)} />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-ink">Areas you serve</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AREAS.map((a) => (
                    <Chip key={a} label={a} active={listing.areas.includes(a)} onClick={() => toggle("areas", a)} />
                  ))}
                </div>
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
            </div>
          )}

          {tab === "Photos" && (
            <PhotoUploader
              businessId={listing.id}
              ownerId={listing.owner_id}
              photos={listing.photos || []}
              onChange={(photos) => setListing({ ...listing, photos })}
            />
          )}

          {tab === "Services" && (
            <ServicesEditor
              services={listing.services || []}
              onChange={(services) => setListing({ ...listing, services })}
            />
          )}

          {tab === "Verification" && (
            <div className="space-y-5">
              <Field label="CR / trade license number">
                <input className="input" value={listing.cr_number || ""} onChange={(e) => setListing({ ...listing, cr_number: e.target.value })} />
              </Field>
              <Field label="Instagram or website">
                <input className="input" value={listing.social_link || ""} onChange={(e) => setListing({ ...listing, social_link: e.target.value })} />
              </Field>

              {!verified && (
                <div className="rounded-xl bg-navy/5 border border-navy/10 px-5 py-4 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-navy shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-ink">Get the verified badge</p>
                    <p className="text-sm text-stone mt-0.5">
                      A verified badge shows customers you're a checked, trustworthy business.
                    </p>
                    <Link href="/business/verify" className="text-sm text-navy font-medium mt-2 inline-block">
                      Learn more →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-8 mt-2 border-t border-stone-line">
            <button
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-terra text-white font-semibold hover:bg-terra-dim active:scale-95 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-sm text-green-700">Saved</span>}
          </div>
        </form>
      </fieldset>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { icon: <Clock size={13} />, bg: "bg-terra/15", text: "text-terra-dim", label: "Pending review" },
    active: { icon: <CheckCircle2 size={13} />, bg: "bg-emerald-100", text: "text-emerald-700", label: "Live" },
    suspended: { icon: <XCircle size={13} />, bg: "bg-red-100", text: "text-red-700", label: "Suspended" },
  }[status] ?? { icon: null, bg: "bg-stone-line", text: "text-stone", label: status };

  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
      {config.icon} {config.label}
    </span>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-stone-line bg-white px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-stone text-xs">{icon} {label}</div>
      <p className="font-display text-2xl font-semibold text-ink mt-1">{value}</p>
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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm px-3.5 py-2 rounded-full border-2 transition-colors ${
        active ? "bg-navy border-navy text-white font-medium" : "bg-white border-stone-line text-ink/70"
      }`}
    >
      {label}
    </button>
  );
}

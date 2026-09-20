"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBCATEGORIES, AREAS } from "@/lib/taxonomy";
import { computeCompleteness } from "@/lib/completeness";
import { isEffectivelyVerified } from "@/lib/verification";
import { isValidBahrainPhone, isValidWhatsAppNumber } from "@/lib/validation";
import { PUBLIC_FIELDS } from "@/lib/businessFields";
import ServicesEditor from "@/components/ServicesEditor";
import PhotoUploader from "@/components/PhotoUploader";
import LogoUploader from "@/components/LogoUploader";
import CompletenessRing from "@/components/CompletenessRing";
import PaymentQRUploader from "@/components/PaymentQRUploader";
import {
  Clock, CheckCircle2, XCircle, Eye, BadgeCheck, ImageIcon, Wrench,
  ShieldCheck, ExternalLink, User, FolderClock, Inbox,
} from "lucide-react";

// Internal/verification info — never shown to customers, so no review needed.
const DIRECT_FIELDS = ["cr_number", "social_link", "applicant_note", "payment_qr_url"] as const;

const TABS = [
  { key: "Profile", icon: User },
  { key: "Photos", icon: ImageIcon },
  { key: "Services", icon: Wrench },
  { key: "Verification", icon: ShieldCheck },
] as const;

export default function Dashboard() {
  const [liveRow, setLiveRow] = useState<any>(null); // untouched, as-fetched — source of truth for status/banners
  const [form, setForm] = useState<any>(null);        // the editable draft the business is working on
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("Profile");
  const [inquiriesCount, setInquiriesCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/business/login");
        return;
      }
      const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).single();
      if (data) {
        const normalized = { ...data, subcategories: data.subcategories || [], areas: data.areas || [] };
        setLiveRow(normalized);
        // Draft starts from whatever's pending, falling back to the live version
        setForm({ ...normalized, ...(normalized.pending_changes || {}) });

        // Just a count now — the full inquiry list lives on its own page
        const { count } = await supabase
          .from("inquiries")
          .select("*", { count: "exact", head: true })
          .eq("business_id", data.id);
        setInquiriesCount(count || 0);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  function toggle(key: "subcategories" | "areas", value: string) {
    const current: string[] = form[key] || [];
    setForm({
      ...form,
      [key]: current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value],
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidBahrainPhone(form.phone)) {
      setError("Phone should be an 8-digit Bahrain number.");
      return;
    }
    if (!isValidWhatsAppNumber(form.whatsapp)) {
      setError("WhatsApp number looks incomplete — include the country code.");
      return;
    }

    setSaving(true);
    const payload: Record<string, any> = {};
    DIRECT_FIELDS.forEach((f) => { payload[f] = form[f]; });

    if (liveRow.status === "active") {
      // Live listing — hold public-facing edits for review, don't touch what's shown now
      const proposed: Record<string, any> = {};
      PUBLIC_FIELDS.forEach((f) => { proposed[f] = form[f]; });
      payload.pending_changes = proposed;
    } else {
      // Not live yet (or suspended) — nothing public to protect, save directly
      PUBLIC_FIELDS.forEach((f) => { payload[f] = form[f]; });
    }

    const { error: saveError } = await supabase.from("businesses").update(payload).eq("id", form.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setLiveRow({ ...liveRow, ...payload });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">Loading…</div>;
  if (!liveRow) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  const { percent, items } = computeCompleteness(form);
  const verified = isEffectivelyVerified(liveRow);
  const suspended = liveRow.status === "suspended";
  const hasPendingChanges = liveRow.status === "active" && !!liveRow.pending_changes;
  const daysSinceApplied = Math.floor((Date.now() - new Date(liveRow.created_at).getTime()) / 86400000);

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {/* Gradient header — identity, status, and completeness at a glance */}
        <div className="relative rounded-2xl bg-gradient-to-br from-navy to-navy-dim px-6 sm:px-8 py-7 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-teal/15 blur-3xl" />
          <div className="relative flex items-start justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                {liveRow.logo_url ? (
                  <img src={liveRow.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-display text-xl font-semibold">{liveRow.name?.[0]?.toUpperCase()}</span>
                )}
                {verified && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-teal ring-2 ring-navy flex items-center justify-center">
                    <BadgeCheck size={11} className="text-white" />
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">{liveRow.name}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={liveRow.status} />
                  {verified && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-white bg-white/15 px-2.5 py-1 rounded-full">
                      <BadgeCheck size={12} />
                      {liveRow.verified_until
                        ? `Verified until ${new Date(liveRow.verified_until).toLocaleDateString()}`
                        : "Verified"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CompletenessRing percent={percent} />
            </div>
          </div>
          <div className="relative flex items-center justify-between mt-6 pt-5 border-t border-white/10 text-white/60 text-xs">
            <span>Applied {daysSinceApplied === 0 ? "today" : `${daysSinceApplied}d ago`} · {new Date(liveRow.created_at).toLocaleDateString()}</span>
            <div className="flex items-center gap-4">
              {liveRow.status === "active" && (
                <Link href={`/listing/${liveRow.id}`} target="_blank" className="flex items-center gap-1.5 text-white/80 hover:text-white">
                  View live <ExternalLink size={12} />
                </Link>
              )}
              <button onClick={handleLogout} className="text-white/80 hover:text-white">Log out</button>
            </div>
          </div>
        </div>

        {suspended && (
          <Banner tone="red" icon={<XCircle size={18} />} title="Your listing is suspended">
            It's not visible to customers right now. If you think this is a mistake, contact{" "}
            <a href="mailto:luupa.net@gmail.com" className="underline">luupa.net@gmail.com</a>.
          </Banner>
        )}

        {hasPendingChanges && (
          <Banner tone="teal" icon={<FolderClock size={18} />} title="Changes awaiting approval">
            Customers still see your previously approved version while we review what you just submitted —
            usually within a day.
          </Banner>
        )}

        {/* Stats — icon-badge cards with real color, elevated against the tinted page background */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <StatCard icon={<Eye size={16} />} tint="navy" label="Profile views" value={liveRow.view_count ?? 0} />
          <StatCard icon={<Wrench size={16} />} tint="stone" label="Services" value={(form.services || []).length} />
          <StatCard icon={<ImageIcon size={16} />} tint="emerald" label="Photos" value={(form.photos || []).length} />
          <StatCard icon={<Inbox size={16} />} tint="teal" label="Inquiries" value={inquiriesCount} />
        </div>

        {/* Getting-started checklist — replaces the flat progress bar with something actionable */}
        {percent < 100 && (
          <div className="mt-4 rounded-2xl bg-white border border-stone-line p-5 sm:p-6">
            <p className="text-sm font-semibold text-ink mb-3">Finish setting up your profile</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm">
                  {item.done ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-stone-line shrink-0" />
                  )}
                  <span className={item.done ? "text-stone line-through" : "text-ink"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs — pill segmented control on an elevated card, not blending into a flat page */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-line shadow-sm shadow-black/[0.02] overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-stone-line overflow-x-auto no-scrollbar bg-canvas2/50">
            {TABS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors relative ${
                  tab === key ? "bg-navy text-white" : "text-ink/70 hover:bg-white"
                }`}
              >
                <Icon size={14} /> {key}
              </button>
            ))}
          </div>

          <fieldset disabled={suspended} className={suspended ? "opacity-50 pointer-events-none" : ""}>
            <form onSubmit={handleSave} className="p-6 sm:p-7">
              {tab === "Profile" && (
                <div className="space-y-5">
                  <LogoUploader
                    ownerId={form.owner_id}
                    logoUrl={form.logo_url}
                    onChange={(logo_url) => setForm({ ...form, logo_url })}
                  />
                  <Field label="Business name">
                    <input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </Field>
                  <div>
                    <span className="text-sm font-medium text-ink">Services you offer</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SUBCATEGORIES.map((s) => (
                        <Chip key={s} label={s} active={form.subcategories.includes(s)} onClick={() => toggle("subcategories", s)} />
                      ))}
                    </div>
                  </div>
                  <label className="flex items-start gap-2.5 rounded-lg border border-stone-line px-4 py-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_mobile || false}
                      onChange={(e) => setForm({ ...form, is_mobile: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="text-sm font-medium text-ink block">We come to you</span>
                      <span className="text-xs text-stone">Mobile service, no fixed shop</span>
                    </span>
                  </label>
                  <div>
                    <span className="text-sm font-medium text-ink">{form.is_mobile ? "Areas you travel to" : "Areas you serve"}</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {AREAS.map((a) => (
                        <Chip key={a} label={a} active={form.areas.includes(a)} onClick={() => toggle("areas", a)} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Phone" hint="8-digit Bahrain number">
                      <input className="input" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </Field>
                    <Field label="WhatsApp" hint="With country code, no +">
                      <input className="input" value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Hours">
                    <input className="input" value={form.hours || ""} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                  </Field>
                  <Field label="Description" hint="Shown to customers, used for search matching">
                    <textarea className="input h-28 py-2" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </Field>
                </div>
              )}

              {tab === "Photos" && (
                <PhotoUploader
                  businessId={form.id}
                  ownerId={form.owner_id}
                  photos={form.photos || []}
                  onChange={(photos) => setForm({ ...form, photos })}
                />
              )}

              {tab === "Services" && (
                <ServicesEditor
                  services={form.services || []}
                  onChange={(services) => setForm({ ...form, services })}
                />
              )}

              {tab === "Verification" && (
                <div className="space-y-5">
                  <Field label="CR / trade license number">
                    <input className="input" value={form.cr_number || ""} onChange={(e) => setForm({ ...form, cr_number: e.target.value })} />
                  </Field>
                  <Field label="Instagram or website">
                    <input className="input" value={form.social_link || ""} onChange={(e) => setForm({ ...form, social_link: e.target.value })} />
                  </Field>

                  <PaymentQRUploader
                    ownerId={form.owner_id}
                    qrUrl={form.payment_qr_url}
                    onChange={(payment_qr_url) => setForm({ ...form, payment_qr_url })}
                  />

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

              {error && <p className="text-sm text-red-600 mt-5">{error}</p>}

              <div className="flex items-center gap-3 pt-7 mt-6 border-t border-stone-line">
                <button
                  disabled={saving}
                  className="px-6 py-3 rounded-lg bg-teal text-white font-semibold hover:bg-teal-dim active:scale-95 transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : liveRow.status === "active" ? "Submit for approval" : "Save changes"}
                </button>
                {saved && <span className="text-sm text-green-700">Saved</span>}
              </div>
            </form>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { icon: <Clock size={13} />, bg: "bg-white/15", text: "text-white", label: "Pending review" },
    active: { icon: <CheckCircle2 size={13} />, bg: "bg-emerald-400/20", text: "text-emerald-300", label: "Live" },
    suspended: { icon: <XCircle size={13} />, bg: "bg-red-400/20", text: "text-red-300", label: "Suspended" },
  }[status] ?? { icon: null, bg: "bg-white/15", text: "text-white", label: status };

  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
      {config.icon} {config.label}
    </span>
  );
}

function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string | number; tint: "navy" | "teal" | "emerald" | "stone" }) {
  const tints = {
    navy: "bg-navy/10 text-navy",
    teal: "bg-teal/10 text-teal-dim",
    emerald: "bg-emerald-100 text-emerald-700",
    stone: "bg-stone-line text-stone",
  }[tint];
  return (
    <div className="rounded-2xl bg-white border border-stone-line px-4 py-4 shadow-sm shadow-black/[0.02]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tints}`}>{icon}</div>
      <p className="font-display text-2xl font-semibold text-ink mt-2.5">{value}</p>
      <p className="text-xs text-stone mt-0.5">{label}</p>
    </div>
  );
}

function Banner({ tone, icon, title, children }: { tone: "red" | "teal"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const tones = {
    red: "bg-red-50 border-red-200 text-red-700",
    teal: "bg-teal/10 border-teal/20 text-teal-dim",
  }[tone];
  return (
    <div className={`mt-6 rounded-2xl border px-5 py-4 flex items-start gap-3 ${tones}`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm opacity-80 mt-0.5">{children}</p>
      </div>
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

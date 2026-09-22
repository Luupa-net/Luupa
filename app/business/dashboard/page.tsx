"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBCATEGORIES, AREAS } from "@/lib/taxonomy";
import { computeCompleteness } from "@/lib/completeness";
import { isEffectivelyVerified } from "@/lib/verification";
import { isValidBahrainPhone, isValidWhatsAppNumber } from "@/lib/validation";
import { getPeriodBounds } from "@/lib/bookingPeriods";
import { PUBLIC_FIELDS } from "@/lib/businessFields";
import ServicesEditor from "@/components/ServicesEditor";
import PhotoUploader from "@/components/PhotoUploader";
import LogoUploader from "@/components/LogoUploader";
import CompletenessRing from "@/components/CompletenessRing";
import PaymentQRUploader from "@/components/PaymentQRUploader";
import {
  Clock, CheckCircle2, XCircle, Eye, BadgeCheck, ImageIcon, Wrench,
  ShieldCheck, ExternalLink, User, FolderClock, LayoutDashboard,
  Wallet, CalendarClock, ArrowRight, Plus, Sparkles, MapPin, Phone, Clock4,
  FileText, Building2, Users, UsersRound,
} from "lucide-react";

// Internal/verification info — never shown to customers, so no review needed.
const DIRECT_FIELDS = ["cr_number", "social_link", "applicant_note", "payment_qr_url"] as const;

const TABS = [
  { key: "Overview", icon: LayoutDashboard },
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
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("Overview");
  const [bookingStats, setBookingStats] = useState({ monthCount: 0, pendingCount: 0, revenueMonth: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/account/login");
        return;
      }
      const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).single();
      if (data) {
        const normalized = { ...data, subcategories: data.subcategories || [], areas: data.areas || [] };
        setLiveRow(normalized);
        // Draft starts from whatever's pending, falling back to the live version
        setForm({ ...normalized, ...(normalized.pending_changes || {}) });

        const { data: bks } = await supabase
          .from("bookings")
          .select("id, customer_name, service, status, created_at, preferred_date, preferred_time, amount, paid")
          .eq("business_id", data.id)
          .order("created_at", { ascending: false })
          .limit(200);
        const all = bks || [];
        const { start, end } = getPeriodBounds("month", 0);
        const inMonth = all.filter((b) => new Date(b.created_at) >= start && new Date(b.created_at) < end);
        setBookingStats({
          monthCount: inMonth.length,
          pendingCount: all.filter((b) => b.status === "pending").length,
          revenueMonth: inMonth.filter((b) => b.paid && b.amount != null).reduce((sum, b) => sum + Number(b.amount || 0), 0),
        });
        setRecentBookings(all.slice(0, 5));
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

  if (loading) {
    return (
      <div className="bg-canvas2 min-h-screen">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="h-40 bg-stone-line/50 rounded-2xl animate-pulse" />
          <div className="h-64 mt-6 bg-white border border-stone-line rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }
  if (!liveRow) return <div className="max-w-4xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  const { percent, items } = computeCompleteness(form);
  const verified = isEffectivelyVerified(liveRow);
  const suspended = liveRow.status === "suspended";
  const hasPendingChanges = liveRow.status === "active" && !!liveRow.pending_changes;
  const daysSinceApplied = Math.floor((Date.now() - new Date(liveRow.created_at).getTime()) / 86400000);

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
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
                <Link href={`/listing/${liveRow.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors">
                  View live <ExternalLink size={12} />
                </Link>
              )}
              <button onClick={handleLogout} className="text-white/80 hover:text-white transition-colors">Log out</button>
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

        {/* Shell — sidebar nav on desktop, horizontal pill tabs on mobile */}
        <div className="mt-8 lg:flex lg:gap-6 lg:items-start">
          <aside className="hidden lg:block lg:w-56 lg:shrink-0 lg:sticky lg:top-24">
            <nav className="bg-white rounded-2xl border border-stone-line shadow-sm shadow-black/[0.02] p-2 space-y-0.5">
              {TABS.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    tab === key ? "bg-navy text-white shadow-sm" : "text-ink/70 hover:bg-canvas2 hover:translate-x-0.5"
                  }`}
                >
                  <Icon size={15} /> {key}
                </button>
              ))}
            </nav>
            <Link
              href="/business/bookings"
              className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink/70 bg-white border border-stone-line hover:border-navy/30 hover:text-ink transition-all"
            >
              <CalendarClock size={15} /> Bookings <ArrowRight size={13} className="ml-auto" />
            </Link>
            <Link
              href="/business/customers"
              className="mt-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink/70 bg-white border border-stone-line hover:border-navy/30 hover:text-ink transition-all"
            >
              <Users size={15} /> Customers <ArrowRight size={13} className="ml-auto" />
            </Link>
            <Link
              href="/business/staff"
              className="mt-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink/70 bg-white border border-stone-line hover:border-navy/30 hover:text-ink transition-all"
            >
              <UsersRound size={15} /> Staff <ArrowRight size={13} className="ml-auto" />
            </Link>
          </aside>

          <div className="lg:hidden flex gap-1 overflow-x-auto no-scrollbar bg-white rounded-xl border border-stone-line p-1.5 mb-4">
            {TABS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  tab === key ? "bg-navy text-white" : "text-ink/70"
                }`}
              >
                <Icon size={14} /> {key}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {tab === "Overview" && (
              <div className="space-y-5">
                {/* KPIs */}
                <div className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible">
                  <KpiCard icon={<Eye size={16} />} tint="navy" label="Profile views" value={liveRow.view_count ?? 0} />
                  <KpiCard icon={<CalendarClock size={16} />} tint="teal" label="Bookings this month" value={bookingStats.monthCount} />
                  <KpiCard icon={<Clock size={16} />} tint="stone" label="Pending confirmations" value={bookingStats.pendingCount} />
                  <KpiCard icon={<Wallet size={16} />} tint="emerald" label="Revenue this month" value={`BHD ${bookingStats.revenueMonth.toFixed(bookingStats.revenueMonth % 1 === 0 ? 0 : 2)}`} />
                </div>

                {/* Quick actions */}
                <div className="rounded-2xl bg-white border border-stone-line p-5 sm:p-6">
                  <p className="text-sm font-semibold text-ink mb-3">Quick actions</p>
                  <div className="flex flex-wrap gap-2.5">
                    <QuickAction href="/business/bookings" icon={<Plus size={14} />} label="Add a booking" primary />
                    {liveRow.status === "active" && (
                      <QuickAction href={`/listing/${liveRow.id}`} icon={<ExternalLink size={14} />} label="View live listing" external />
                    )}
                    {!verified && (
                      <QuickAction href="/business/verify" icon={<Sparkles size={14} />} label="Get verified" />
                    )}
                    <button
                      onClick={() => setTab("Profile")}
                      className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150"
                    >
                      <User size={14} /> Edit profile
                    </button>
                  </div>
                </div>

                {/* Getting-started checklist */}
                {percent < 100 && (
                  <div className="rounded-2xl bg-white border border-stone-line p-5 sm:p-6">
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

                {/* Recent bookings */}
                <div className="rounded-2xl bg-white border border-stone-line p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-ink">Recent bookings</p>
                    <Link href="/business/bookings" className="text-xs font-medium text-navy hover:text-navy-light flex items-center gap-1">
                      View all <ArrowRight size={12} />
                    </Link>
                  </div>
                  {recentBookings.length === 0 ? (
                    <p className="text-sm text-stone py-4 text-center">No bookings yet — once customers start booking, they'll show up here.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentBookings.map((b) => (
                        <Link
                          key={b.id}
                          href="/business/bookings"
                          className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-canvas2 transition-colors"
                        >
                          <span className="w-8 h-8 rounded-full bg-navy/10 text-navy font-semibold text-xs flex items-center justify-center shrink-0">
                            {b.customer_name?.[0]?.toUpperCase() || "?"}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-ink truncate">{b.customer_name}</span>
                            <span className="block text-xs text-stone truncate">{b.service || "No service specified"}</span>
                          </span>
                          <RecentStatusChip status={b.status} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab !== "Overview" && (
              <div className="bg-white rounded-2xl border border-stone-line shadow-sm shadow-black/[0.02] overflow-hidden">
                <fieldset disabled={suspended} className={suspended ? "opacity-50 pointer-events-none" : ""}>
                  <form onSubmit={handleSave} className="p-6 sm:p-7">
                    {tab === "Profile" && (
                      <div className="space-y-5">
                        <ProfileCard icon={<Building2 size={14} />} title="Identity">
                          <LogoUploader
                            ownerId={form.owner_id}
                            logoUrl={form.logo_url}
                            onChange={(logo_url) => setForm({ ...form, logo_url })}
                          />
                          <Field label="Business name">
                            <input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                          </Field>
                        </ProfileCard>

                        <ProfileCard icon={<Wrench size={14} />} title="Services & coverage">
                          <div>
                            <span className="text-sm font-medium text-ink">Services you offer</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {SUBCATEGORIES.map((s) => (
                                <Chip key={s} label={s} active={form.subcategories.includes(s)} onClick={() => toggle("subcategories", s)} />
                              ))}
                            </div>
                          </div>
                          <label className="flex items-start gap-2.5 rounded-lg border border-stone-line px-4 py-3.5 cursor-pointer hover:border-navy/30 transition-colors">
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
                            <span className="text-sm font-medium text-ink flex items-center gap-1.5"><MapPin size={13} /> {form.is_mobile ? "Areas you travel to" : "Areas you serve"}</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {AREAS.map((a) => (
                                <Chip key={a} label={a} active={form.areas.includes(a)} onClick={() => toggle("areas", a)} />
                              ))}
                            </div>
                          </div>
                        </ProfileCard>

                        <ProfileCard icon={<Phone size={14} />} title="Contact & hours">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Phone" hint="8-digit Bahrain number">
                              <input className="input" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </Field>
                            <Field label="WhatsApp" hint="With country code, no +">
                              <input className="input" value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                            </Field>
                          </div>
                          <Field label="Hours">
                            <div className="relative">
                              <Clock4 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
                              <input className="input pl-8" value={form.hours || ""} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                            </div>
                          </Field>
                        </ProfileCard>

                        <ProfileCard icon={<FileText size={14} />} title="Description">
                          <Field label="Shown to customers" hint="Used for search matching too">
                            <textarea className="input h-28 py-2" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                          </Field>
                        </ProfileCard>
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
                        className="px-6 py-3 rounded-lg bg-teal text-white font-semibold hover:bg-teal-dim hover:shadow-lg hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-150 disabled:opacity-60"
                      >
                        {saving ? "Saving…" : liveRow.status === "active" ? "Submit for approval" : "Save changes"}
                      </button>
                      {saved && <span className="text-sm text-green-700">Saved</span>}
                    </div>
                  </form>
                </fieldset>
              </div>
            )}
          </div>
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

function KpiCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string | number; tint: "navy" | "teal" | "emerald" | "stone" }) {
  const tints = {
    navy: "bg-navy/10 text-navy",
    teal: "bg-teal/10 text-teal-dim",
    emerald: "bg-emerald-100 text-emerald-700",
    stone: "bg-stone-line text-stone",
  }[tint];
  return (
    <div className="shrink-0 w-[160px] sm:w-auto rounded-2xl bg-white border border-stone-line px-4 py-4 shadow-sm shadow-black/[0.02] transition-shadow hover:shadow-md">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tints}`}>{icon}</div>
      <p className="font-display text-2xl font-semibold text-ink mt-2.5">{value}</p>
      <p className="text-xs text-stone mt-0.5">{label}</p>
    </div>
  );
}

function QuickAction({ href, icon, label, primary, external }: { href: string; icon: React.ReactNode; label: string; primary?: boolean; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] ${
        primary ? "bg-navy text-white shadow-sm hover:bg-navy-light hover:shadow-lg" : "bg-canvas2 text-ink hover:bg-stone-line/60"
      }`}
    >
      {icon} {label}
    </Link>
  );
}

function RecentStatusChip({ status }: { status: string }) {
  const tones: Record<string, string> = {
    pending: "bg-teal/10 text-teal-dim",
    confirmed: "bg-navy/10 text-navy",
    arrived: "bg-skyblue/10 text-skyblue-dim",
    in_progress: "bg-skyblue/10 text-skyblue-dim",
    completed: "bg-emerald-100 text-emerald-700",
    declined: "bg-stone-line text-stone",
    no_show: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-50 text-red-600",
  };
  return (
    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${tones[status] || "bg-stone-line text-stone"}`}>
      {status.replace("_", " ")}
    </span>
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

function ProfileCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-line p-5 space-y-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <span className="w-6 h-6 rounded-md bg-navy/10 text-navy flex items-center justify-center">{icon}</span>
        {title}
      </p>
      {children}
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
      className={`text-sm px-3.5 py-2 rounded-full border-2 transition-all duration-150 hover:-translate-y-0.5 active:scale-95 ${
        active ? "bg-navy border-navy text-white font-medium shadow-sm" : "bg-white border-stone-line text-ink/70 hover:border-navy/30"
      }`}
    >
      {label}
    </button>
  );
}

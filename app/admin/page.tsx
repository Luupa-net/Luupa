"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, XCircle, Clock, ShieldCheck, LogOut, ExternalLink,
  LayoutDashboard, Building2, Users, CalendarClock, Search, Eye,
  AlertCircle, TrendingUp, Star,
} from "lucide-react";
import { isEffectivelyVerified, VERIFICATION_DURATIONS, addMonths } from "@/lib/verification";

type Business = {
  id: string;
  name: string;
  logo_url: string | null;
  subcategories: string[];
  areas: string[];
  phone: string;
  whatsapp: string;
  hours: string;
  description: string;
  services: { name: string; price?: string }[];
  photos: string[];
  cr_number: string | null;
  social_link: string | null;
  applicant_note: string | null;
  status: "pending" | "active" | "suspended";
  verified: boolean;
  verified_until: string | null;
  view_count: number;
  created_at: string;
  pending_changes: Record<string, any> | null;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type Booking = {
  id: string;
  business_id: string;
  customer_name: string;
  customer_contact: string;
  customer_email: string | null;
  service: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  source: "luupa" | "manual";
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  created_at: string;
  customer_id: string | null;
  businesses: { name: string } | null;
  customers: { name: string; email: string | null } | null;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name", logo_url: "Logo", subcategories: "Services offered", areas: "Areas served",
  phone: "Phone", whatsapp: "WhatsApp", hours: "Hours", description: "Description",
  services: "Services list", photos: "Photos",
};

const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "businesses", label: "Businesses", icon: Building2 },
  { key: "customers", label: "Customers", icon: Users },
  { key: "bookings", label: "Bookings", icon: CalendarClock },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

const BOOKING_STATUS_STYLES: Record<string, string> = {
  pending: "bg-terra/10 text-terra-dim",
  confirmed: "bg-teal/10 text-teal-dim",
  declined: "bg-red-50 text-red-600",
  arrived: "bg-skyblue/10 text-skyblue-dim",
  in_progress: "bg-skyblue/10 text-skyblue-dim",
  completed: "bg-navy/10 text-navy",
  no_show: "bg-red-50 text-red-600",
  cancelled: "bg-stone-line text-stone",
};

function formatFieldValue(key: string, value: any): string {
  if (value == null || value === "") return "(empty)";
  if (key === "subcategories" || key === "areas") return (value as string[]).join(", ");
  if (key === "services") return (value as { name: string; price?: string }[]).map((s) => s.name).join(", ") || "(none)";
  if (key === "photos") return `${(value as string[]).length} photo${(value as string[]).length === 1 ? "" : "s"}`;
  if (key === "logo_url") return value ? "New logo uploaded" : "(none)";
  return String(value);
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("overview");

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [bizTab, setBizTab] = useState<"pending" | "active" | "suspended">("pending");
  const [bizSearch, setBizSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    const [bizRes, custRes, bookRes] = await Promise.all([
      fetch("/api/admin/businesses"),
      fetch("/api/admin/customers"),
      fetch("/api/admin/bookings"),
    ]);
    if (!bizRes.ok) {
      setAuthed(false);
      return;
    }
    setBusinesses((await bizRes.json()).businesses ?? []);
    if (custRes.ok) setCustomers((await custRes.json()).customers ?? []);
    if (bookRes.ok) setBookings((await bookRes.json()).bookings ?? []);
    setAuthed(true);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      loadAll();
    } else {
      const data = await res.json();
      setLoginError(data.error || "Login failed.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setPassword("");
  }

  async function updateStatus(businessId: string, status: string, verified: boolean, verifiedUntil?: string | null) {
    setLoading(true);
    await fetch("/api/admin/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, status, verified, verifiedUntil }),
    });
    await loadAll();
    setLoading(false);
  }

  async function reviewChanges(businessId: string, action: "approve" | "reject") {
    setLoading(true);
    await fetch("/api/admin/review-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, action }),
    });
    await loadAll();
    setLoading(false);
  }

  const counts = useMemo(() => ({
    pending: businesses.filter((b) => b.status === "pending").length,
    active: businesses.filter((b) => b.status === "active").length,
    suspended: businesses.filter((b) => b.status === "suspended").length,
  }), [businesses]);
  const verifiedCount = businesses.filter((b) => isEffectivelyVerified(b)).length;
  const pendingChangesCount = businesses.filter((b) => !!b.pending_changes).length;
  const totalViews = businesses.reduce((sum, b) => sum + (b.view_count || 0), 0);
  const pendingBookingsCount = bookings.filter((b) => b.status === "pending").length;

  const filteredBusinesses = businesses
    .filter((b) => b.status === bizTab)
    .filter((b) => !bizSearch.trim() || b.name.toLowerCase().includes(bizSearch.trim().toLowerCase()));

  const filteredCustomers = customers.filter(
    (c) =>
      !customerSearch.trim() ||
      c.name?.toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
      c.phone?.includes(customerSearch.trim())
  );

  const filteredBookings = bookings
    .filter((b) => bookingStatusFilter === "all" || b.status === bookingStatusFilter)
    .filter((b) => {
      if (!bookingSearch.trim()) return true;
      const q = bookingSearch.trim().toLowerCase();
      return (
        b.customer_name?.toLowerCase().includes(q) ||
        b.businesses?.name?.toLowerCase().includes(q) ||
        b.service?.toLowerCase().includes(q)
      );
    });

  if (authed === null) {
    return <div className="max-w-md mx-auto px-6 py-24 text-center text-stone">Loading…</div>;
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-6 py-24">
        <div className="w-11 h-11 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
          <ShieldCheck size={20} className="text-navy" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink">Admin access</h1>
        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            type="password"
            autoFocus
            placeholder="Password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <button className="w-full h-12 rounded-lg bg-navy text-white font-semibold hover:bg-navy-light transition-colors">
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-canvas2">
      {/* Sidebar (desktop) / top tab bar (mobile) */}
      <aside className="md:w-56 shrink-0 bg-navy text-white flex md:flex-col">
        <div className="hidden md:block px-5 pt-6 pb-4">
          <span className="font-display text-xl font-semibold tracking-wide">
            luup<span className="text-teal">a</span> <span className="text-white/50 text-sm font-body font-normal">admin</span>
          </span>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 md:px-3 py-2 md:py-2 gap-1 flex-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const badge = s.key === "businesses" ? counts.pending : s.key === "bookings" ? pendingBookingsCount : 0;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  section === s.key ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {s.label}
                {badge > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-terra text-white px-1.5 py-0.5 rounded-full">{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="hidden md:block px-3 pb-4 pt-2 border-t border-white/10 mt-auto">
          <button onClick={handleLogout} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium text-white/65 hover:bg-white/10 hover:text-white w-full transition-colors">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="md:hidden flex justify-end px-5 py-2 bg-white border-b border-stone-line">
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-stone">
            <LogOut size={13} /> Log out
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
          {section === "overview" && (
            <OverviewSection
              businesses={businesses}
              customers={customers}
              bookings={bookings}
              counts={counts}
              verifiedCount={verifiedCount}
              pendingChangesCount={pendingChangesCount}
              totalViews={totalViews}
              pendingBookingsCount={pendingBookingsCount}
              onJump={setSection}
              onOpenBusinessTab={(t) => { setBizTab(t); setSection("businesses"); }}
            />
          )}

          {section === "businesses" && (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Businesses</h1>
              </div>
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <div className="flex gap-2">
                  {(["pending", "active", "suspended"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBizTab(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        bizTab === t ? "bg-navy text-white" : "bg-white border border-stone-line text-ink/70"
                      }`}
                    >
                      {t} ({counts[t]})
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
                  <input
                    value={bizSearch}
                    onChange={(e) => setBizSearch(e.target.value)}
                    placeholder="Search by name…"
                    className="input pl-8"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {filteredBusinesses.length === 0 && (
                  <p className="text-stone text-sm py-10 text-center">Nothing here right now.</p>
                )}
                {filteredBusinesses.map((b) => (
                  <BusinessCard key={b.id} business={b} onUpdate={updateStatus} onReviewChanges={reviewChanges} loading={loading} />
                ))}
              </div>
            </div>
          )}

          {section === "customers" && (
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Customers</h1>
              <p className="text-sm text-stone mt-1">{customers.length} account{customers.length === 1 ? "" : "s"} total</p>
              <div className="relative mt-5 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="input pl-8"
                />
              </div>
              <div className="mt-5 bg-white rounded-xl border border-stone-line overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-line text-left text-xs text-stone uppercase tracking-wide">
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                        <th className="px-4 py-3 font-medium">Bookings</th>
                        <th className="px-4 py-3 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr key={c.id} className="border-b border-stone-line last:border-0 hover:bg-canvas2/60">
                          <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{c.name}</td>
                          <td className="px-4 py-3 text-ink/80 whitespace-nowrap">{c.email || "—"}</td>
                          <td className="px-4 py-3 text-ink/80 whitespace-nowrap">{c.phone ? `+${c.phone}` : "—"}</td>
                          <td className="px-4 py-3 text-ink/80 whitespace-nowrap">
                            {bookings.filter((bk) => bk.customer_id === c.id).length}
                          </td>
                          <td className="px-4 py-3 text-stone whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredCustomers.length === 0 && (
                  <p className="text-stone text-sm py-10 text-center">No customers match.</p>
                )}
              </div>
            </div>
          )}

          {section === "bookings" && (
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Bookings</h1>
              <p className="text-sm text-stone mt-1">Across every business on the platform</p>
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="input !w-auto"
                >
                  <option value="all">All statuses</option>
                  {["pending", "confirmed", "declined", "arrived", "in_progress", "completed", "no_show", "cancelled"].map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
                  <input
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search customer, business, service…"
                    className="input pl-8"
                  />
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {filteredBookings.length === 0 && (
                  <p className="text-stone text-sm py-10 text-center">No bookings match.</p>
                )}
                {filteredBookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl border border-stone-line p-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ink">{b.businesses?.name ?? "Unknown business"}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${BOOKING_STATUS_STYLES[b.status] ?? "bg-stone-line text-stone"}`}>
                          {b.status.replace("_", " ")}
                        </span>
                        {b.source === "manual" && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-line text-stone">Manual entry</span>
                        )}
                      </div>
                      <p className="text-sm text-stone mt-1">
                        {b.customer_name} · {b.customer_contact}
                        {b.service ? ` · ${b.service}` : ""}
                      </p>
                      {(b.vehicle_make || b.vehicle_model || b.vehicle_plate) && (
                        <p className="text-xs text-stone mt-0.5">
                          {[b.vehicle_make, b.vehicle_model, b.vehicle_plate].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-stone shrink-0">
                      {b.preferred_date && <p>{new Date(b.preferred_date).toLocaleDateString()}{b.preferred_time ? ` · ${b.preferred_time}` : ""}</p>}
                      <p className="mt-0.5">Booked {new Date(b.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewSection({
  businesses, customers, bookings, counts, verifiedCount, pendingChangesCount, totalViews, pendingBookingsCount, onJump, onOpenBusinessTab,
}: {
  businesses: Business[];
  customers: Customer[];
  bookings: Booking[];
  counts: { pending: number; active: number; suspended: number };
  verifiedCount: number;
  pendingChangesCount: number;
  totalViews: number;
  pendingBookingsCount: number;
  onJump: (s: Section) => void;
  onOpenBusinessTab: (t: "pending" | "active" | "suspended") => void;
}) {
  const needsAttention = businesses.filter((b) => b.status === "pending" || !!b.pending_changes);
  const recentBookings = bookings.slice(0, 6);

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Overview</h1>
      <p className="text-sm text-stone mt-1">Everything on Luupa, at a glance.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatCard icon={Building2} label="Total businesses" value={businesses.length} onClick={() => onJump("businesses")} />
        <StatCard icon={AlertCircle} label="Pending review" value={counts.pending} tone={counts.pending > 0 ? "terra" : undefined} onClick={() => onOpenBusinessTab("pending")} />
        <StatCard icon={ShieldCheck} label="Verified" value={verifiedCount} tone="navy" />
        <StatCard icon={XCircle} label="Suspended" value={counts.suspended} tone={counts.suspended > 0 ? "red" : undefined} onClick={() => onOpenBusinessTab("suspended")} />
        <StatCard icon={Users} label="Customer accounts" value={customers.length} onClick={() => onJump("customers")} />
        <StatCard icon={CalendarClock} label="Bookings, pending" value={pendingBookingsCount} tone={pendingBookingsCount > 0 ? "terra" : undefined} onClick={() => onJump("bookings")} />
        <StatCard icon={TrendingUp} label="Total profile views" value={totalViews} />
        <StatCard icon={Star} label="Changes to review" value={pendingChangesCount} tone={pendingChangesCount > 0 ? "terra" : undefined} onClick={() => onJump("businesses")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-8">
        <div className="bg-white rounded-xl border border-stone-line p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-ink">Needs your attention</h2>
            <button onClick={() => onJump("businesses")} className="text-xs font-medium text-navy hover:underline">View all</button>
          </div>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-stone py-6 text-center">Nothing waiting on you — nice.</p>
          ) : (
            <div className="space-y-2">
              {needsAttention.slice(0, 6).map((b) => (
                <button
                  key={b.id}
                  onClick={() => onOpenBusinessTab(b.status === "pending" ? "pending" : "active")}
                  className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-canvas2 text-left transition-colors"
                >
                  <span className="text-sm font-medium text-ink truncate">{b.name}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-terra/10 text-terra-dim shrink-0">
                    {b.status === "pending" ? "New application" : "Pending changes"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-line p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-ink">Recent bookings</h2>
            <button onClick={() => onJump("bookings")} className="text-xs font-medium text-navy hover:underline">View all</button>
          </div>
          {recentBookings.length === 0 ? (
            <p className="text-sm text-stone py-6 text-center">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{b.businesses?.name ?? "—"}</p>
                    <p className="text-xs text-stone truncate">{b.customer_name}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${BOOKING_STATUS_STYLES[b.status] ?? "bg-stone-line text-stone"}`}>
                    {b.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, onClick }: { icon: any; label: string; value: number; tone?: "navy" | "terra" | "red"; onClick?: () => void }) {
  const tones = { navy: "text-navy", terra: "text-terra-dim", red: "text-red-600" };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`bg-white rounded-xl border border-stone-line px-4 py-3.5 text-left ${onClick ? "hover:border-navy/30 transition-colors" : ""}`}>
      <div className="flex items-center gap-1.5 text-stone">
        <Icon size={13} />
        <p className="text-xs">{label}</p>
      </div>
      <p className={`font-display text-2xl font-semibold mt-1 ${tone ? tones[tone] : "text-ink"}`}>{value}</p>
    </Comp>
  );
}

function BusinessCard({
  business,
  onUpdate,
  onReviewChanges,
  loading,
}: {
  business: Business;
  onUpdate: (id: string, status: string, verified: boolean, verifiedUntil?: string | null) => void;
  onReviewChanges: (id: string, action: "approve" | "reject") => void;
  loading: boolean;
}) {
  const b = business;
  const [showDurations, setShowDurations] = useState(false);
  const effectivelyVerified = isEffectivelyVerified(b);

  function grantVerification(months: number) {
    const until = addMonths(new Date(), months).toISOString();
    onUpdate(b.id, "active", true, until);
    setShowDurations(false);
  }
  return (
    <div className="border border-stone-line rounded-xl p-5 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {b.logo_url ? (
            <img src={b.logo_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 border border-stone-line" />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-navy/10 text-navy flex items-center justify-center shrink-0 font-display font-semibold">
              {b.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-ink truncate">{b.name}</h3>
            <p className="text-xs text-stone mt-0.5 truncate">{(b.subcategories || []).join(", ")} · {(b.areas || []).join(", ")}</p>
          </div>
        </div>
        <StatusPill status={b.status} />
      </div>

      <p className="text-sm text-ink/80 mt-3 leading-relaxed">{b.description || "No description provided."}</p>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-sm">
        <Info label="Phone" value={b.phone} />
        <Info label="WhatsApp" value={b.whatsapp} />
        <Info label="CR number" value={b.cr_number || "Not provided"} />
        <Info
          label="Social / website"
          value={b.social_link || "Not provided"}
          link={b.social_link || undefined}
        />
      </div>

      {b.services?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {b.services.map((s, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-canvas2 text-ink/70">
              {s.name}{s.price ? ` (BHD ${s.price})` : ""}
            </span>
          ))}
        </div>
      )}

      {b.applicant_note && (
        <p className="text-sm text-stone mt-3 italic">"{b.applicant_note}"</p>
      )}

      <p className="text-xs text-stone mt-3 flex items-center gap-1.5 flex-wrap">
        Applied {new Date(b.created_at).toLocaleDateString()}
        <span className="flex items-center gap-1"><Eye size={11} /> {b.view_count} views</span>
        {b.verified && (
          <> · {effectivelyVerified
            ? (b.verified_until ? `Verified until ${new Date(b.verified_until).toLocaleDateString()}` : "Verified (no expiry)")
            : "Verification expired"}
          </>
        )}
      </p>

      {business.pending_changes && (
        <div className="mt-4 rounded-lg bg-terra/5 border border-terra/20 p-4">
          <p className="text-sm font-semibold text-terra-dim mb-2">Pending changes — not yet visible to customers</p>
          <div className="space-y-1 text-sm">
            {Object.entries(business.pending_changes)
              .map(([key, value]) => ({
                key,
                value,
                changed: formatFieldValue(key, value) !== formatFieldValue(key, (business as any)[key]),
              }))
              .sort((a, b) => Number(b.changed) - Number(a.changed))
              .map(({ key, value, changed }) => (
                <div
                  key={key}
                  className={`flex justify-between gap-3 rounded-md px-2 -mx-2 py-1 ${changed ? "bg-terra/10" : ""}`}
                >
                  <span className={changed ? "text-terra-dim font-medium" : "text-stone"}>
                    {changed && "● "}{FIELD_LABELS[key] || key}
                  </span>
                  <span className={`text-right ${changed ? "text-ink font-semibold" : "text-stone"}`}>
                    {formatFieldValue(key, value)}
                  </span>
                </div>
              ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              disabled={loading}
              onClick={() => onReviewChanges(business.id, "approve")}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-navy text-white hover:bg-navy-light transition-colors disabled:opacity-60"
            >
              <CheckCircle2 size={13} /> Approve changes
            </button>
            <button
              disabled={loading}
              onClick={() => onReviewChanges(business.id, "reject")}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              <XCircle size={13} /> Reject changes
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-stone-line">
        {b.status !== "active" && (
          <button
            disabled={loading}
            onClick={() => onUpdate(b.id, "active", b.verified)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-navy text-white hover:bg-navy-light transition-colors disabled:opacity-60"
          >
            <CheckCircle2 size={15} /> Approve
          </button>
        )}
        {b.status === "active" && (
          effectivelyVerified ? (
            <button
              disabled={loading}
              onClick={() => onUpdate(b.id, b.status, false, null)}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-navy/30 text-navy hover:bg-navy/5 transition-colors disabled:opacity-60"
            >
              <ShieldCheck size={15} /> Remove verified
            </button>
          ) : (
            <div className="relative">
              <button
                disabled={loading}
                onClick={() => setShowDurations((s) => !s)}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-navy/30 text-navy hover:bg-navy/5 transition-colors disabled:opacity-60"
              >
                <ShieldCheck size={15} /> Mark verified (paid)
              </button>
              {showDurations && (
                <div className="absolute left-0 mt-2 bg-white rounded-lg border border-stone-line shadow-lg p-2 flex gap-1.5 z-10">
                  {VERIFICATION_DURATIONS.map((d) => (
                    <button
                      key={d.months}
                      onClick={() => grantVerification(d.months)}
                      className="text-xs font-medium px-3 py-2 rounded-md bg-canvas2 text-ink hover:bg-navy hover:text-white transition-colors whitespace-nowrap"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {b.status !== "suspended" && (
          <button
            disabled={loading}
            onClick={() => onUpdate(b.id, "suspended", false, null)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            <XCircle size={15} /> Reject / suspend
          </button>
        )}
        {b.status !== "pending" && (
          <button
            disabled={loading}
            onClick={() => onUpdate(b.id, "pending", b.verified)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-stone-line text-stone hover:bg-canvas2 transition-colors disabled:opacity-60"
          >
            <Clock size={15} /> Move to pending
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles = {
    pending: "bg-terra/10 text-terra-dim",
    active: "bg-navy/10 text-navy",
    suspended: "bg-red-50 text-red-600",
  }[status] ?? "bg-stone-line text-stone";
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${styles}`}>{status}</span>;
}

function Info({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-stone">{label}</span>
      {link ? (
        <a href={link.startsWith("http") ? link : `https://${link}`} target="_blank" className="text-navy font-medium flex items-center gap-1 truncate">
          {value} <ExternalLink size={11} />
        </a>
      ) : (
        <span className="text-ink font-medium truncate">{value}</span>
      )}
    </div>
  );
}

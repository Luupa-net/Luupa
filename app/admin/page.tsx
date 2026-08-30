"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, ShieldCheck, LogOut, ExternalLink } from "lucide-react";

type Business = {
  id: string;
  name: string;
  subcategory: string;
  area: string;
  phone: string;
  whatsapp: string;
  description: string;
  services: string[];
  cr_number: string | null;
  social_link: string | null;
  applicant_note: string | null;
  status: "pending" | "active" | "suspended";
  verified: boolean;
  view_count: number;
  created_at: string;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tab, setTab] = useState<"pending" | "active" | "suspended">("pending");
  const [loading, setLoading] = useState(false);

  async function checkSession() {
    const res = await fetch("/api/admin/businesses");
    if (res.ok) {
      const data = await res.json();
      setBusinesses(data.businesses);
      setAuthed(true);
    } else {
      setAuthed(false);
    }
  }

  useEffect(() => { checkSession(); }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      checkSession();
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

  async function updateStatus(businessId: string, status: string, verified: boolean) {
    setLoading(true);
    await fetch("/api/admin/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, status, verified }),
    });
    await checkSession();
    setLoading(false);
  }

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

  const filtered = businesses.filter((b) => b.status === tab);
  const counts = {
    pending: businesses.filter((b) => b.status === "pending").length,
    active: businesses.filter((b) => b.status === "active").length,
    suspended: businesses.filter((b) => b.status === "suspended").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Review businesses</h1>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-stone hover:text-ink">
          <LogOut size={14} /> Log out
        </button>
      </div>

      <div className="flex gap-2 mt-6">
        {(["pending", "active", "suspended"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-navy text-white" : "bg-canvas2 text-ink/70"
            }`}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filtered.length === 0 && (
          <p className="text-stone text-sm py-10 text-center">Nothing here right now.</p>
        )}
        {filtered.map((b) => (
          <BusinessCard key={b.id} business={b} onUpdate={updateStatus} loading={loading} />
        ))}
      </div>
    </div>
  );
}

function BusinessCard({
  business,
  onUpdate,
  loading,
}: {
  business: Business;
  onUpdate: (id: string, status: string, verified: boolean) => void;
  loading: boolean;
}) {
  const b = business;
  return (
    <div className="border border-stone-line rounded-xl p-5 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">{b.name}</h3>
          <p className="text-xs text-stone mt-0.5">{b.subcategory} · {b.area}</p>
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
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-canvas2 text-ink/70">{s}</span>
          ))}
        </div>
      )}

      {b.applicant_note && (
        <p className="text-sm text-stone mt-3 italic">"{b.applicant_note}"</p>
      )}

      <p className="text-xs text-stone mt-3">
        Applied {new Date(b.created_at).toLocaleDateString()} · {b.view_count} views
      </p>

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
        {!b.verified && (
          <button
            disabled={loading}
            onClick={() => onUpdate(b.id, "active", true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-navy/30 text-navy hover:bg-navy/5 transition-colors disabled:opacity-60"
          >
            <ShieldCheck size={15} /> Approve + verify
          </button>
        )}
        {b.status !== "suspended" && (
          <button
            disabled={loading}
            onClick={() => onUpdate(b.id, "suspended", false)}
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
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${styles}`}>{status}</span>;
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

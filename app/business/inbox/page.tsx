"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizeWhatsAppNumber } from "@/lib/validation";
import ManualBookingForm from "@/components/ManualBookingForm";
import {
  ArrowLeft, Search, MessageCircle, CalendarPlus, Archive, ArchiveRestore,
  Mail, MailOpen, Inbox as InboxIcon,
} from "lucide-react";

export default function InboxPage() {
  const [business, setBusiness] = useState<any>(null);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [convertTarget, setConvertTarget] = useState<any>(null);
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
        const { data: inq } = await supabase
          .from("inquiries")
          .select("*")
          .eq("business_id", biz.id)
          .order("created_at", { ascending: false });
        setInquiries(inq || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  function updateInquiry(id: string, changes: Record<string, any>) {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
    supabase.from("inquiries").update(changes).eq("id", id);
  }

  function replyOnWhatsApp(inquiry: any) {
    if (!inquiry.read) updateInquiry(inquiry.id, { read: true });
    const number = normalizeWhatsAppNumber(inquiry.customer_contact || "");
    const text = `Hi ${inquiry.customer_name}, thanks for reaching out to ${business?.name}!`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-16 text-stone">Loading…</div>;
  if (!business) return <div className="max-w-3xl mx-auto px-6 py-16 text-stone">No listing found.</div>;

  const visible = inquiries
    .filter((i) => !!i.archived === showArchived)
    .filter((i) => !search.trim() || i.customer_name?.toLowerCase().includes(search.trim().toLowerCase()));

  const unreadCount = inquiries.filter((i) => !i.read && !i.archived).length;
  const todayCount = inquiries.filter((i) => isToday(i.created_at) && !i.archived).length;
  const grouped = groupByRecency(visible);

  return (
    <div className="bg-canvas2 min-h-screen">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <Link href="/business/dashboard" className="flex items-center gap-1.5 text-sm text-stone hover:text-ink mb-4">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Inbox</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="rounded-xl bg-white border border-stone-line px-4 py-3.5">
            <p className="font-display text-2xl font-semibold text-ink">{inquiries.filter((i) => !i.archived).length}</p>
            <p className="text-xs text-stone mt-0.5">Total</p>
          </div>
          <div className="rounded-xl bg-white border border-stone-line px-4 py-3.5">
            <p className="font-display text-2xl font-semibold text-terra-dim">{unreadCount}</p>
            <p className="text-xs text-stone mt-0.5">Unread</p>
          </div>
          <div className="rounded-xl bg-white border border-stone-line px-4 py-3.5">
            <p className="font-display text-2xl font-semibold text-ink">{todayCount}</p>
            <p className="text-xs text-stone mt-0.5">Today</p>
          </div>
        </div>

        {/* Search + archive toggle */}
        <div className="flex items-center gap-3 mt-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="input pl-9"
            />
          </div>
          <button
            onClick={() => setShowArchived((s) => !s)}
            className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${
              showArchived ? "bg-navy text-white" : "bg-white border border-stone-line text-ink/70"
            }`}
          >
            <Archive size={14} /> Archived
          </button>
        </div>

        {/* Grouped list */}
        <div className="mt-6 space-y-6">
          {grouped.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-line">
              <InboxIcon size={28} className="text-stone-dim mx-auto mb-2" />
              <p className="text-stone text-sm">
                {showArchived ? "Nothing archived." : "No inquiries yet — they'll show up here when a customer reaches out."}
              </p>
            </div>
          )}
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide text-stone font-medium mb-2">{label}</p>
              <div className="space-y-2.5">
                {items.map((inq) => (
                  <InquiryCard
                    key={inq.id}
                    inquiry={inq}
                    onMarkRead={() => updateInquiry(inq.id, { read: !inq.read })}
                    onArchive={() => updateInquiry(inq.id, { archived: !inq.archived })}
                    onReply={() => replyOnWhatsApp(inq)}
                    onConvert={() => setConvertTarget(inq)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {convertTarget && (
        <ManualBookingForm
          businessId={business.id}
          initialName={convertTarget.customer_name}
          initialContact={convertTarget.customer_contact}
          onAdded={() => {
            if (!convertTarget.read) updateInquiry(convertTarget.id, { read: true });
          }}
          onClose={() => setConvertTarget(null)}
        />
      )}
    </div>
  );
}

function InquiryCard({
  inquiry: inq, onMarkRead, onArchive, onReply, onConvert,
}: {
  inquiry: any; onMarkRead: () => void; onArchive: () => void; onReply: () => void; onConvert: () => void;
}) {
  return (
    <div className={`rounded-lg border p-4 ${inq.read ? "border-stone-line bg-white" : "border-terra/30 bg-terra/5"}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-navy/10 text-navy font-semibold text-sm flex items-center justify-center shrink-0">
          {inq.customer_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink text-sm truncate">{inq.customer_name}</span>
            <span className="text-xs text-stone shrink-0">{relativeTime(inq.created_at)}</span>
          </div>
          <p className="text-xs text-stone mt-0.5">{inq.customer_contact}</p>
          {inq.message && <p className="text-sm text-ink/80 mt-1.5">{inq.message}</p>}

          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={onReply} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-navy text-white hover:bg-navy-light transition-colors">
              <MessageCircle size={12} /> Reply on WhatsApp
            </button>
            <button onClick={onConvert} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-stone-line text-ink/70 hover:bg-canvas2 transition-colors">
              <CalendarPlus size={12} /> Convert to booking
            </button>
            <button onClick={onMarkRead} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-stone-line text-ink/70 hover:bg-canvas2 transition-colors">
              {inq.read ? <Mail size={12} /> : <MailOpen size={12} />} {inq.read ? "Mark unread" : "Mark read"}
            </button>
            <button onClick={onArchive} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-stone-line text-ink/70 hover:bg-canvas2 transition-colors">
              {inq.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />} {inq.archived ? "Unarchive" : "Archive"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(iso: string): boolean {
  const d = new Date(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function groupByRecency(items: any[]): { label: string; items: any[] }[] {
  const today: any[] = [];
  const yesterday: any[] = [];
  const earlier: any[] = [];
  for (const i of items) {
    if (isToday(i.created_at)) today.push(i);
    else if (isYesterday(i.created_at)) yesterday.push(i);
    else earlier.push(i);
  }
  const groups = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length) groups.push({ label: "Earlier", items: earlier });
  return groups;
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useBookingAlerts, formatWhen, type AlertBooking } from "@/lib/BookingAlertsContext";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { Bell, BellRing, Check, X, Volume2, VolumeX, MonitorSmartphone, ArrowRight, Loader2, CalendarClock, Car } from "lucide-react";

// Toast stack — top right on desktop, top of screen on phones. Each toast
// can be actioned without leaving the page you're on.
export function BookingAlertToasts() {
  const { enabled, toasts, dismissToast, respond, openBooking } = useBookingAlerts();
  if (!enabled || toasts.length === 0) return null;
  return (
    <div className="print:hidden fixed top-20 right-3 sm:right-6 z-[70] w-[calc(100%-1.5rem)] sm:w-[360px] space-y-2.5 pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <AlertToast
          key={t.key}
          booking={t.booking}
          onDismiss={() => dismissToast(t.key)}
          onRespond={(status) => respond(t.booking.id, status)}
          onOpen={() => {
            dismissToast(t.key);
            openBooking(t.booking.id);
          }}
        />
      ))}
    </div>
  );
}

function AlertToast({
  booking: b,
  onDismiss,
  onRespond,
  onOpen,
}: {
  booking: AlertBooking;
  onDismiss: () => void;
  onRespond: (status: "confirmed" | "declined") => Promise<{ error?: string }>;
  onOpen: () => void;
}) {
  const [busy, setBusy] = useState<"confirmed" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vehicle = [b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ");

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(onDismiss, 12_000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(status: "confirmed" | "declined") {
    setBusy(status);
    const result = await onRespond(status);
    setBusy(null);
    if (result.error) setError(result.error);
  }

  return (
    <div className="pointer-events-auto group relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur border border-teal/25 shadow-[0_20px_50px_-15px_rgba(6,37,28,0.45)] panel-in">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-teal via-teal-light to-navy" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="relative w-10 h-10 rounded-full bg-navy text-white font-display font-semibold flex items-center justify-center shrink-0">
            {b.customer_name?.[0]?.toUpperCase() || "?"}
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal-light ring-2 ring-white">
              <span className="absolute inset-0 rounded-full bg-teal-light animate-ping" />
            </span>
          </span>
          <button onClick={onOpen} className="flex-1 min-w-0 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-dim">New booking request</p>
            <p className="text-sm font-semibold text-ink truncate">{b.customer_name || "Customer"}</p>
            <p className="text-xs text-stone truncate">{b.service || "Service not specified"}</p>
          </button>
          <button onClick={onDismiss} aria-label="Dismiss" className="text-stone hover:text-ink p-0.5 -mr-1">
            <X size={15} />
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-canvas2 text-ink/80"><CalendarClock size={11} /> {formatWhen(b)}</span>
          {vehicle && <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-canvas2 text-ink/80"><Car size={11} /> {vehicle}</span>}
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <button onClick={() => act("confirmed")} disabled={!!busy} className="flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-xl bg-navy text-white hover:bg-navy-light active:scale-[0.97] transition-all disabled:opacity-60">
            {busy === "confirmed" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirm
          </button>
          <button onClick={() => act("declined")} disabled={!!busy} className="flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-xl border border-stone-line text-ink hover:border-red-200 hover:text-red-600 active:scale-[0.97] transition-all disabled:opacity-60">
            {busy === "declined" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Decline
          </button>
          <button onClick={onOpen} aria-label="Open booking" className="px-3 rounded-xl bg-canvas2 text-ink hover:bg-stone-line/60 transition-colors">
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      {/* Countdown — pauses while you hover so it doesn't vanish mid-read;
          the toast dismisses itself when this bar runs out. */}
      <div className="h-0.5 bg-stone-line/60">
        <div
          className="h-full bg-teal origin-left group-hover:[animation-play-state:paused]"
          style={{ animation: "shrinkX 12s linear forwards" }}
          // Reduced-motion users get a ~0ms animation (globals.css), so only
          // a bar that genuinely ran its course dismisses — they're covered
          // by the plain timer in the effect above instead.
          onAnimationEnd={(e) => { if (e.elapsedTime > 1) onDismiss(); }}
        />
      </div>
    </div>
  );
}

// Bell + inbox dropdown for the navbar.
export function BookingAlertBell({ compact = false }: { compact?: boolean }) {
  const { enabled, pending, unseenCount, markSeen, respond, soundOn, toggleSound, desktopPermission, requestDesktop, openBooking } = useBookingAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!enabled) return null;
  const count = pending.length;
  const Icon = unseenCount > 0 ? BellRing : Bell;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          markSeen();
        }}
        aria-label={`Booking requests${count ? ` (${count} pending)` : ""}`}
        className={`relative ${compact ? "w-11 h-11" : "w-9 h-9"} rounded-lg flex items-center justify-center text-ink/70 hover:text-ink hover:bg-canvas2 transition-colors`}
      >
        <Icon size={compact ? 20 : 18} className={unseenCount > 0 ? "text-teal-dim origin-top animate-[bellShake_1.2s_ease-in-out_infinite]" : ""} />
        {count > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-canvas ${unseenCount > 0 ? "bg-teal new-glow" : "bg-navy"}`}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-[68px] sm:top-auto sm:right-0 sm:mt-2 sm:w-[380px] bg-white rounded-2xl border border-stone-line shadow-2xl shadow-black/10 overflow-hidden z-[60] animate-[fadeUp_0.15s_ease-out]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-stone-line bg-gradient-to-br from-navy to-navy-dim text-white">
            <div>
              <p className="text-sm font-semibold">Booking requests</p>
              <p className="text-[11px] text-white/60">{count === 0 ? "You're all caught up" : `${count} waiting for a reply`}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleSound} aria-label={soundOn ? "Mute alert sound" : "Unmute alert sound"} title={soundOn ? "Sound on" : "Sound off"} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
                {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} className="text-white/50" />}
              </button>
            </div>
          </div>

          {desktopPermission === "default" && (
            <button onClick={requestDesktop} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left bg-teal/[0.06] hover:bg-teal/10 border-b border-stone-line transition-colors">
              <MonitorSmartphone size={15} className="text-teal-dim shrink-0" />
              <span className="text-xs text-ink">
                <b>Turn on desktop alerts</b> — get notified even when Luupa is in another tab.
              </span>
            </button>
          )}

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-stone-line">
            {count === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto w-12 h-12 rounded-full bg-canvas2 flex items-center justify-center mb-3"><Check size={20} className="text-teal-dim" /></span>
                <p className="text-sm text-ink font-medium">Nothing waiting</p>
                <p className="text-xs text-stone mt-1">New requests appear here instantly.</p>
              </div>
            ) : (
              pending.slice(0, 8).map((b) => <InboxRow key={b.id} booking={b} onRespond={respond} onOpen={() => { setOpen(false); openBooking(b.id); }} />)
            )}
          </div>

          <Link href="/business/bookings" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold text-navy hover:bg-canvas2 border-t border-stone-line transition-colors">
            Open bookings board <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

function InboxRow({ booking: b, onRespond, onOpen }: { booking: AlertBooking; onRespond: (id: string, s: "confirmed" | "declined") => Promise<{ error?: string }>; onOpen: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function act(status: "confirmed" | "declined") {
    setBusy(status);
    await onRespond(b.id, status);
    setBusy(null);
  }
  return (
    <div className="px-4 py-3 hover:bg-canvas2/60 transition-colors">
      <button onClick={onOpen} className="w-full text-left flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-navy/10 text-navy text-xs font-semibold flex items-center justify-center shrink-0">{b.customer_name?.[0]?.toUpperCase() || "?"}</span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink truncate">{b.customer_name || "Customer"}</span>
            <span className="text-[10px] text-stone shrink-0">{formatRelativeTime(b.created_at)}</span>
          </span>
          <span className="block text-xs text-stone truncate">{b.service || "Service not specified"} · {formatWhen(b)}</span>
        </span>
      </button>
      <div className="flex gap-2 mt-2 pl-11">
        <button onClick={() => act("confirmed")} disabled={!!busy} className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navy-light disabled:opacity-60">
          {busy === "confirmed" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Confirm
        </button>
        <button onClick={() => act("declined")} disabled={!!busy} className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-stone-line text-ink hover:text-red-600 hover:border-red-200 disabled:opacity-60">
          {busy === "declined" ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Decline
        </button>
      </div>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/lib/BusinessContext";
import { notifyCustomerOfStatus } from "@/lib/notifyCustomer";

// Live "you've got a new booking" layer for owners AND staff, mounted once
// in the root layout so it works on every page — not only while the
// Bookings calendar happens to be open (which used to be the only place a
// new booking announced itself, as a small green dot).
//
//   • In-app toast with Confirm / Decline / Open, right where you are
//   • A short chime (toggleable) + vibration on phones
//   • Desktop notification when the tab is in the background (opt-in)
//   • Flashing tab title "(2) New booking" while you're away
//   • Live pending count for the navbar bell + its quick-action inbox
//
// Owners get instant Realtime pushes. Staff can't subscribe to the base
// bookings table (no SELECT policy — revenue columns), so for them this
// polls the revenue-free bookings_operational view every 15s while the tab
// is visible, and immediately on refocus.

export type AlertBooking = {
  id: string;
  business_id: string;
  customer_name: string | null;
  service: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  note: string | null;
  status: string;
  source: string | null;
  created_at: string;
};

export type BookingAlertEvent = { type: "insert"; row: any } | { type: "update"; id: string; changes: Record<string, any> };

type Toast = { key: string; booking: AlertBooking };
type Permission = "default" | "granted" | "denied" | "unsupported";

type Ctx = {
  enabled: boolean;
  pending: AlertBooking[];
  unseenCount: number;
  markSeen: () => void;
  toasts: Toast[];
  dismissToast: (key: string) => void;
  soundOn: boolean;
  toggleSound: () => void;
  desktopPermission: Permission;
  requestDesktop: () => Promise<void>;
  respond: (id: string, status: "confirmed" | "declined") => Promise<{ error?: string }>;
  subscribe: (fn: (e: BookingAlertEvent) => void) => () => void;
  openBooking: (id: string) => void;
};

const BookingAlertsContext = createContext<Ctx | null>(null);

const COLUMNS = "id, business_id, customer_name, service, preferred_date, preferred_time, vehicle_make, vehicle_model, note, status, source, created_at";
const STAFF_POLL_MS = 15_000;

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function BookingAlertsProvider({ children }: { children: React.ReactNode }) {
  const { business, role, checked } = useBusiness();
  const router = useRouter();
  const enabled = checked && !!business && (role === "owner" || role === "staff");
  const isStaff = role === "staff";
  const businessId: string | null = enabled ? business.id : null;

  const [pending, setPending] = useState<AlertBooking[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [soundOn, setSoundOn] = useState(true);
  const [desktopPermission, setDesktopPermission] = useState<Permission>("unsupported");
  const listeners = useRef(new Set<(e: BookingAlertEvent) => void>());
  const knownIds = useRef(new Set<string>());
  const audioRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const emit = useCallback((e: BookingAlertEvent) => {
    listeners.current.forEach((fn) => fn(e));
  }, []);

  // Preferences + desktop-notification support.
  useEffect(() => {
    setSoundOn(storageGet("luupa:alertSound") !== "off");
    if (typeof window !== "undefined" && "Notification" in window) setDesktopPermission(Notification.permission as Permission);
  }, []);
  useEffect(() => {
    if (!businessId) return;
    setSeenAt(Number(storageGet(`luupa:alertsSeenAt:${businessId}`)) || 0);
  }, [businessId]);

  // Browsers only allow audio after a user gesture — unlock on the first one.
  useEffect(() => {
    if (!enabled) return;
    function unlock() {
      try {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctor && !audioRef.current) audioRef.current = new Ctor();
        audioRef.current?.resume();
      } catch {
        // no audio — fine
      }
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabled]);

  const chime = useCallback(() => {
    if (!soundOnRef.current) return;
    const ctx = audioRef.current;
    if (!ctx || ctx.state !== "running") return;
    // Two soft rising notes — noticeable, not alarming.
    [
      { f: 880, t: 0 },
      { f: 1318.5, t: 0.14 },
    ].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const start = ctx.currentTime + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }, []);

  const openBooking = useCallback(
    (id: string) => {
      router.push(`/business/bookings?open=${id}`);
    },
    [router]
  );

  const announce = useCallback(
    (b: AlertBooking) => {
      // No timer here: each toast dismisses itself when its countdown bar
      // finishes (BookingAlerts.tsx), so hovering — which pauses the bar —
      // genuinely keeps it on screen while it's being read.
      const key = `${b.id}-${Date.now()}`;
      setToasts((prev) => [...prev.slice(-3), { key, booking: b }]);
      chime();
      try {
        navigator.vibrate?.([120, 60, 120]);
      } catch {
        // ignore
      }
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        try {
          const when = [b.preferred_date, b.preferred_time].filter(Boolean).join(" · ");
          const n = new Notification(`New booking — ${b.customer_name || "Customer"}`, {
            body: [b.service || "Service not specified", when].filter(Boolean).join(" · "),
            tag: `booking-${b.id}`,
          });
          n.onclick = () => {
            window.focus();
            openBooking(b.id);
            n.close();
          };
        } catch {
          // Some mobile browsers only allow notifications via a service worker.
        }
      }
    },
    [chime, openBooking]
  );

  // Initial load of what's waiting right now (never announced — only
  // bookings that arrive while you're here get a toast).
  const loadPending = useCallback(async () => {
    if (!businessId) return null;
    const { data, error } = await supabase
      .from(isStaff ? "bookings_operational" : "bookings")
      .select(COLUMNS)
      .eq("business_id", businessId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return null;
    return (data || []) as AlertBooking[];
  }, [businessId, isStaff]);

  useEffect(() => {
    if (!businessId) {
      setPending([]);
      knownIds.current = new Set();
      return;
    }
    let cancelled = false;
    loadPending().then((rows) => {
      if (cancelled || !rows) return;
      rows.forEach((r) => knownIds.current.add(r.id));
      setPending(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, loadPending]);

  // Owners: Realtime push.
  useEffect(() => {
    if (!businessId || isStaff) return;
    const channel = supabase
      .channel(`booking-alerts-${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${businessId}` }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as AlertBooking;
          emit({ type: "insert", row: payload.new });
          if (row.status === "pending" && !knownIds.current.has(row.id)) {
            knownIds.current.add(row.id);
            setPending((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
            announce(row);
          }
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as AlertBooking;
          setPending((prev) => {
            const without = prev.filter((p) => p.id !== row.id);
            return row.status === "pending" ? [row, ...without].sort((a, b) => b.created_at.localeCompare(a.created_at)) : without;
          });
        } else if (payload.eventType === "DELETE") {
          setPending((prev) => prev.filter((p) => p.id !== payload.old?.id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, isStaff, announce, emit]);

  // Staff: visibility-aware polling of the revenue-free view.
  useEffect(() => {
    if (!businessId || !isStaff) return;
    let timer: number | undefined;
    let stopped = false;
    async function tick() {
      const rows = await loadPending();
      if (stopped || !rows) return;
      const fresh = rows.filter((r) => !knownIds.current.has(r.id));
      fresh.forEach((r) => {
        knownIds.current.add(r.id);
        emit({ type: "insert", row: r });
      });
      setPending(rows);
      // Only announce genuinely new ones, oldest first so the newest toast ends on top.
      fresh.slice(0, 3).reverse().forEach((r) => announce(r));
    }
    function schedule() {
      window.clearInterval(timer);
      if (!document.hidden) timer = window.setInterval(tick, STAFF_POLL_MS);
    }
    function onVisibility() {
      if (!document.hidden) tick();
      schedule();
    }
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tick);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tick);
    };
  }, [businessId, isStaff, loadPending, announce, emit]);

  const unseenCount = useMemo(() => pending.filter((p) => new Date(p.created_at).getTime() > seenAt).length, [pending, seenAt]);

  // Flash the tab title while there's something unseen and you're elsewhere.
  useEffect(() => {
    if (!enabled || unseenCount === 0) return;
    const base = document.title.replace(/^\(\d+\) New booking · /, "");
    let flip = false;
    const id = window.setInterval(() => {
      if (!document.hidden) {
        document.title = base;
        return;
      }
      flip = !flip;
      document.title = flip ? `(${unseenCount}) New booking · ${base}` : base;
    }, 1500);
    return () => {
      window.clearInterval(id);
      document.title = base;
    };
  }, [enabled, unseenCount]);

  const markSeen = useCallback(() => {
    if (!businessId) return;
    const now = Date.now();
    setSeenAt(now);
    storageSet(`luupa:alertsSeenAt:${businessId}`, String(now));
  }, [businessId]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      storageSet("luupa:alertSound", prev ? "off" : "on");
      return !prev;
    });
  }, []);

  const requestDesktop = useCallback(async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setDesktopPermission(result as Permission);
    } catch {
      // ignore
    }
  }, []);

  const respond = useCallback(
    async (id: string, status: "confirmed" | "declined") => {
      const previous = pending;
      setPending((prev) => prev.filter((p) => p.id !== id));
      setToasts((prev) => prev.filter((t) => t.booking.id !== id));
      // Staff go through the whitelisted RPC (migration v29) — a direct
      // UPDATE silently matches 0 rows for them under RLS.
      const { error } = isStaff
        ? await supabase.rpc("update_booking_operational", { p_booking_id: id, p_changes: { status } })
        : await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) {
        setPending(previous);
        return { error: "Couldn't update that booking — try again." };
      }
      emit({ type: "update", id, changes: { status } });
      notifyCustomerOfStatus(id, status);
      return {};
    },
    [pending, isStaff, emit]
  );

  const subscribe = useCallback((fn: (e: BookingAlertEvent) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value: Ctx = {
    enabled,
    pending,
    unseenCount,
    markSeen,
    toasts,
    dismissToast: (key) => setToasts((prev) => prev.filter((t) => t.key !== key)),
    soundOn,
    toggleSound,
    desktopPermission,
    requestDesktop,
    respond,
    subscribe,
    openBooking,
  };

  return <BookingAlertsContext.Provider value={value}>{children}</BookingAlertsContext.Provider>;
}

export function useBookingAlerts() {
  const ctx = useContext(BookingAlertsContext);
  if (!ctx) throw new Error("useBookingAlerts must be used within BookingAlertsProvider");
  return ctx;
}

export function formatWhen(b: { preferred_date: string | null; preferred_time: string | null }): string {
  const parts: string[] = [];
  if (b.preferred_date) {
    const d = new Date(`${b.preferred_date}T00:00:00`);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    parts.push(
      d.toDateString() === today.toDateString()
        ? "Today"
        : d.toDateString() === tomorrow.toDateString()
        ? "Tomorrow"
        : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
    );
  }
  if (b.preferred_time) parts.push(b.preferred_time);
  return parts.join(" · ") || "Flexible timing";
}

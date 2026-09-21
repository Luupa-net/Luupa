"use client";

import { useEffect, useRef } from "react";

// Keyboard shortcuts for the booking status actions in BookingDrawer — bound
// once on window so they keep working no matter which tab (Details/Payment/
// History/Notes) is currently active. The mapping mirrors the exact set of
// actions BookingDrawerHistoryTab.tsx exposes as buttons for each status:
//
//   status "pending"      c = confirm            x = decline
//   status "confirmed"    a = customer arrived    n = no-show    x = cancel
//   status "arrived"      w = car left with us (-> in_progress)
//   status "in_progress"  f = mark completed
//
// "x" is reused for both decline and cancel since they're both the "stop
// this booking" action, just at different points in the flow, and a status
// only ever allows one of them at a time — no ambiguity in practice.
// Every other status (declined/no_show/cancelled/completed) has no actions
// left, so no key does anything.
//
// Typing anywhere (an <input>, <textarea>, <select>, or any
// contenteditable element) always wins — the listener bails out before
// looking at the key at all.
export type BookingKeyboardShortcutCallbacks = {
  onConfirm?: () => void;
  onDecline?: () => void;
  onArrived?: () => void;
  onNoShow?: () => void;
  onCancel?: () => void;
  onInProgress?: () => void;
  onComplete?: () => void;
};

export function useBookingKeyboardShortcuts(
  status: string | undefined,
  callbacks: BookingKeyboardShortcutCallbacks
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }

      const cb = callbacksRef.current;
      const key = e.key.toLowerCase();

      if (status === "pending") {
        if (key === "c") cb.onConfirm?.();
        else if (key === "x") cb.onDecline?.();
      } else if (status === "confirmed") {
        if (key === "a") cb.onArrived?.();
        else if (key === "n") cb.onNoShow?.();
        else if (key === "x") cb.onCancel?.();
      } else if (status === "arrived") {
        if (key === "w") cb.onInProgress?.();
      } else if (status === "in_progress") {
        if (key === "f") cb.onComplete?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status]);
}

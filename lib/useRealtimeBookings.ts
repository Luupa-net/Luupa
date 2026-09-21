"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type BookingChangeEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: any;
  old: any;
};

// Shared Realtime subscription for the `bookings` table, scoped to either a
// business (owner-side) or a customer (account-side) — RLS on the
// `postgres_changes` stream already limits a connection to rows it's allowed
// to see, so this just wires the filter + merge callback up client-side.
//
// The effect intentionally depends on [filterColumn, filterValue] only, NOT
// on `onChange`. Callers typically pass an inline callback that's a new
// function reference on every render (e.g. one that closes over state) — if
// that were a dependency, the channel would tear down and resubscribe on
// every render. Instead we keep the latest `onChange` in a ref and always
// call through it, so the subscription itself only churns when what it's
// actually subscribed to changes.
export function useRealtimeBookings(
  filterColumn: "business_id" | "customer_id",
  filterValue: string | null | undefined,
  onChange: (event: BookingChangeEvent) => void
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!filterValue) return;

    const channel = supabase
      .channel(`bookings-${filterColumn}-${filterValue}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `${filterColumn}=eq.${filterValue}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          onChangeRef.current({
            eventType: payload.eventType as BookingChangeEvent["eventType"],
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterColumn, filterValue]);
}

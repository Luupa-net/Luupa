-- migration-v31: money columns hold BHD's three decimals (fils).
--
-- Every money column was numeric(10,2), so Postgres silently rounded the
-- third decimal: a BHD 7.125 checkout was stored, receipted and reported as
-- BHD 7.130 (found by the pre-launch end-to-end test, 2026-10-11). Widening
-- the scale keeps every existing value exactly as it is.
--
-- None of these columns appear in a view, so the type change is direct.
-- Safe to re-run.

alter table bookings
  alter column amount type numeric(12,3),
  alter column discount_amount type numeric(12,3);

alter table booking_payments
  alter column amount type numeric(12,3);

alter table booking_items
  alter column unit_price type numeric(12,3);

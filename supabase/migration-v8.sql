-- Luupa migration v8 — run this in your Supabase SQL editor.
-- Extends bookings with a real operational lifecycle (beyond just
-- pending/confirmed/declined), payment tracking, and support for businesses
-- manually logging appointments that came from outside Luupa.

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check check (
  status in ('pending', 'confirmed', 'declined', 'arrived', 'in_progress', 'completed', 'no_show', 'cancelled')
);

alter table bookings add column if not exists paid boolean default false;
alter table bookings add column if not exists source text default 'luupa' check (source in ('luupa', 'manual'));

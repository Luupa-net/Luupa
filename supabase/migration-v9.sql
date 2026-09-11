-- Luupa migration v9 — run this in your Supabase SQL editor.
-- Adds vehicle details and payment method, for the richer booking detail view.

alter table bookings add column if not exists vehicle_make text;
alter table bookings add column if not exists vehicle_model text;
alter table bookings add column if not exists vehicle_plate text;
alter table bookings add column if not exists payment_method text check (payment_method in ('cash', 'card'));

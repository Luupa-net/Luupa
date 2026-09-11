-- Luupa migration v10 — run this in your Supabase SQL editor.
-- Adds a customer email field, so businesses can send the invoice by email
-- as an alternative to WhatsApp.

alter table bookings add column if not exists customer_email text;

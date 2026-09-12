-- Luupa migration v12 — run this in your Supabase SQL editor.
-- Adds support for mobile/roaming businesses that come to the customer
-- instead of having a fixed shop location.

alter table businesses add column if not exists is_mobile boolean default false;

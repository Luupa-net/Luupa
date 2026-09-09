-- Luupa migration v5 — run this in your Supabase SQL editor.
-- Adds a "pending changes" system: once a listing is live, edits to
-- customer-facing fields (name, logo, photos, services, etc.) are held here
-- for admin approval instead of applying instantly — the currently-approved
-- version stays live and visible until the new edit is approved.

alter table businesses add column if not exists pending_changes jsonb;

-- Businesses need to be able to write their own draft changes here — this is
-- NOT protected by the admin-only trigger, since submitting an edit for
-- review is exactly what a business should be able to do themselves.

-- Luupa migration v11 — run this in your Supabase SQL editor.
-- Adds an archive flag to inquiries, so a business can declutter their inbox
-- without permanently deleting anything.

alter table inquiries add column if not exists archived boolean default false;

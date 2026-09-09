-- Luupa migration v4 — run this in your Supabase SQL editor.
-- Adds an expiry date to verification, so a badge naturally stops appearing once
-- it lapses — no scheduled job needed, since every read checks the date live.

alter table businesses add column if not exists verified_until timestamptz;

-- Extend the admin-protection trigger to cover this new field too — a business
-- still cannot set their own expiry date, same as verified/status/tier.
create or replace function protect_admin_controlled_fields()
returns trigger as $$
begin
  if auth.role() != 'service_role'
     and coalesce(current_setting('app.bypass_admin_protection', true), '') != 'true' then
    new.status := old.status;
    new.verified := old.verified;
    new.verified_until := old.verified_until;
    new.tier := old.tier;
    new.view_count := old.view_count;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- SECURITY FIX: the original photo upload policy only checked that a user was
-- logged in — it did NOT check they were uploading to their OWN folder. That
-- meant any logged-in business could technically upload a photo into another
-- business's folder. This closes that gap by requiring the folder name to
-- match the uploader's own user id, same restriction the delete policy already had.
drop policy if exists "Authenticated users can upload their own photos" on storage.objects;
create policy "Authenticated users can upload only to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'business-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SECURITY FIX: the client-side 5MB/2MB checks only stop the normal upload UI —
-- someone calling the storage API directly could send a much larger or
-- non-image file. This enforces real limits at the bucket level itself.
update storage.buckets
set file_size_limit = 5242880,  -- 5MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'business-photos';

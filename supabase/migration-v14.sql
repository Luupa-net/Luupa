-- Luupa migration v14 — run this in your Supabase SQL editor.
-- SECURITY FIX: the pending-changes-for-review workflow (see migration v5)
-- was only enforced client-side, in app/business/dashboard/page.tsx. The
-- "Owners can update their own listing" RLS policy has no column
-- restriction, so a business owner could call the Supabase REST API
-- directly with their own JWT and overwrite a live (status = 'active')
-- listing's public content instantly — name, description, phone, whatsapp,
-- hours, services, photos, subcategories, areas, is_mobile, logo_url —
-- completely skipping admin review.
--
-- This replaces protect_admin_controlled_fields() with a version that also
-- enforces that workflow at the database level: for any non-service-role
-- update to a row that was already 'active', changes to those PUBLIC_FIELDS
-- columns (lib/businessFields.ts) are diverted into pending_changes (merged
-- with whatever pending_changes the caller sent, or the existing draft if
-- they didn't touch that column) and the live columns are reset back to
-- their old values. The admin-controlled-field protection (status, verified,
-- verified_until, tier, view_count) and the app.bypass_admin_protection
-- escape hatch used by increment_view_count() are unchanged.

create or replace function protect_admin_controlled_fields()
returns trigger as $$
declare
  changed_public jsonb := '{}'::jsonb;
begin
  if auth.role() != 'service_role'
     and coalesce(current_setting('app.bypass_admin_protection', true), '') != 'true' then
    new.status := old.status;
    new.verified := old.verified;
    new.verified_until := old.verified_until;
    new.tier := old.tier;
    new.view_count := old.view_count;

    if old.status = 'active' then
      if new.name is distinct from old.name then
        changed_public := changed_public || jsonb_build_object('name', new.name);
      end if;
      if new.logo_url is distinct from old.logo_url then
        changed_public := changed_public || jsonb_build_object('logo_url', new.logo_url);
      end if;
      if new.subcategories is distinct from old.subcategories then
        changed_public := changed_public || jsonb_build_object('subcategories', to_jsonb(new.subcategories));
      end if;
      if new.areas is distinct from old.areas then
        changed_public := changed_public || jsonb_build_object('areas', to_jsonb(new.areas));
      end if;
      if new.phone is distinct from old.phone then
        changed_public := changed_public || jsonb_build_object('phone', new.phone);
      end if;
      if new.whatsapp is distinct from old.whatsapp then
        changed_public := changed_public || jsonb_build_object('whatsapp', new.whatsapp);
      end if;
      if new.hours is distinct from old.hours then
        changed_public := changed_public || jsonb_build_object('hours', new.hours);
      end if;
      if new.description is distinct from old.description then
        changed_public := changed_public || jsonb_build_object('description', new.description);
      end if;
      if new.services is distinct from old.services then
        changed_public := changed_public || jsonb_build_object('services', new.services);
      end if;
      if new.photos is distinct from old.photos then
        changed_public := changed_public || jsonb_build_object('photos', new.photos);
      end if;
      if new.is_mobile is distinct from old.is_mobile then
        changed_public := changed_public || jsonb_build_object('is_mobile', new.is_mobile);
      end if;

      -- Only touch pending_changes if a PUBLIC_FIELDS column actually
      -- changed in this UPDATE. This keeps the legitimate dashboard flow
      -- intact: when a business submits an edit, it sets NEW.pending_changes
      -- directly to its full proposed object and leaves the live columns
      -- alone, so changed_public stays empty and NEW.pending_changes passes
      -- through untouched below.
      if changed_public != '{}'::jsonb then
        new.pending_changes := coalesce(new.pending_changes, '{}'::jsonb) || changed_public;
      end if;

      -- Reset the live columns — the change now lives only in pending_changes.
      new.name := old.name;
      new.logo_url := old.logo_url;
      new.subcategories := old.subcategories;
      new.areas := old.areas;
      new.phone := old.phone;
      new.whatsapp := old.whatsapp;
      new.hours := old.hours;
      new.description := old.description;
      new.services := old.services;
      new.photos := old.photos;
      new.is_mobile := old.is_mobile;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- No trigger changes needed — enforce_admin_controlled_fields already points
-- at this function name, so CREATE OR REPLACE above is enough to pick up the
-- new behavior on the existing "before update on businesses" trigger.

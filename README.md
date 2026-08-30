# Luupa — Bahrain Car Care Directory

Built with **Next.js** (frontend/framework) + **Supabase** (database, auth, security)
+ **Vercel** (hosting).

## What's included

- Homepage with live keyword-matching search
- Browse/search page with subcategory + area filters, pulling real data from Supabase
- Individual listing pages with photo galleries, services, and WhatsApp click-to-chat
- A full multi-step business signup: account → details → services → verification info →
  review screen → submit. Nothing goes live until you approve it.
- Business dashboard: clear status banner (pending/live/suspended), full editing,
  photo upload (up to 6 photos), a services list editor, and a view count once live
- A password-protected **admin page** (`/admin`) where you review, approve, verify,
  or reject every new business
- Database security enforced at the database level — not just hidden in the app:
  a business genuinely cannot set their own "verified" badge, flip their own status
  to live, or upgrade their own tier, even by tampering with requests in their browser

## Setup — step by step

### 1. If this is a brand-new Supabase project
- Go to supabase.com, create a project
- In the SQL Editor, run `supabase/schema.sql` — this sets up everything in one go,
  including the photo storage bucket

### 2. If you already have the old version running
- In the SQL Editor, run `supabase/migration-v2.sql` instead — it only adds what's
  new (verification fields, the admin-security trigger, photo storage) without
  touching your existing data or recreating tables that already exist

### 3. Turn off "Confirm email" in Supabase (important, do this)
Go to **Authentication → Providers → Email** in your Supabase dashboard and turn off
**"Confirm email."** Here's why this matters: right now, a business needs to be
logged in the moment they submit their application for their details to save
correctly. If email confirmation is required, they'd have a gap between signing up
and being able to log in — which would break the submission. You can turn this back
on later once you want extra signup rigor; it's not required for the site to work
either way, just recommended off for now.

### 4. Get your service role key (for the admin area)
In Supabase, go to **Project Settings → API**. You'll see two keys: the **anon public**
key (already in use) and the **service_role** key. Copy the service_role key —
**treat this like a master password**, never share it or put it anywhere public.
It's what lets the admin page approve/reject businesses regardless of the normal
security rules.

### 5. Configure environment variables
Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from before
- `SUPABASE_SERVICE_ROLE_KEY` — from step 4
- `ADMIN_PASSWORD` — choose your own strong password for the `/admin` page
- `ADMIN_SESSION_SECRET` — any long random string (e.g. generate one at
  [randomkeygen.com](https://randomkeygen.com), the "CodeIgniter Encryption Keys"
  ones work well) — this is used to sign your admin login session, not the password
  itself

### 6. Run it locally
```bash
npm install
npm run dev
```
Visit http://localhost:3000

### 7. Deploy to Vercel
- Push this project to GitHub
- Import it in Vercel
- Add **all five** environment variables from step 5 in Vercel's project settings
  (Settings → Environment Variables)
- Deploy

### 8. Connect your domain
In Vercel → Domains, add luupa.net (or whichever you bought) and follow the DNS steps shown.

## Using the admin page

Visit `yoursite.com/admin` and enter the password you set in step 5. From there you can:
- See every business grouped by **Pending / Active / Suspended**
- Review their details, services, CR number, and social link before deciding
- **Approve** (goes live, no badge), **Approve + verify** (goes live with a verified
  badge), **Reject/suspend**, or move something back to pending

Nobody can reach this data without your password — not through the website's normal
pages, not by tampering with browser requests, since the actual approve/reject action
runs through a protected server route using the service role key, which never touches
the browser at all.

## Making changes later

- Any page is a normal React file under `app/` — edit and save, changes appear instantly in dev
- To add a new category (e.g. Beauty & Grooming), add it to the `SUBCATEGORIES` lists in
  `components/SignupWizard.tsx`, `app/business/dashboard/page.tsx`, and `app/browse/page.tsx`


# Luupa — Bahrain Car Care Directory

Built with **Next.js** (frontend/framework) + **Supabase** (database, auth, security)
+ **Vercel** (hosting). This combination was chosen specifically because it's fast,
handles security (passwords/sessions) for you instead of you building that yourself,
and is easy to extend as you add categories or features later.

## What's included

- Homepage with live keyword-matching search (the "signature" interaction)
- Browse/search page with subcategory + area filters, pulling real data from Supabase
- Individual business listing pages with WhatsApp click-to-chat
- Business signup + login (Supabase Auth — secure by default, no passwords stored by you)
- Business dashboard to edit their own listing
- Database schema with Row Level Security — enforced at the database level, so a
  business genuinely cannot edit another business's listing even if there were a bug
  in the app code

## Setup — step by step

### 1. Create your Supabase project
- Go to supabase.com, sign up (free tier is enough to start), create a new project
- In the SQL Editor, paste and run the contents of `supabase/schema.sql` — this creates
  your tables and security rules in one go
- In Project Settings → API, copy your **Project URL** and **anon public key**

### 2. Configure environment variables
- Copy `.env.local.example` to `.env.local`
- Paste in your Supabase URL and anon key

### 3. Run it locally
```bash
npm install
npm run dev
```
Visit http://localhost:3000

### 4. Deploy to Vercel
- Push this project to a GitHub repository
- Go to vercel.com, sign up, click "New Project," import your GitHub repo
- Add the same two environment variables from `.env.local` in Vercel's project settings
- Deploy — Vercel gives you a live URL immediately, and auto-deploys every time you push changes

### 5. Connect your domain
- Buy your domain (e.g. luupa.net or luupa.com) from a registrar
- In Vercel project settings → Domains, add it and follow the DNS instructions shown

## Making changes later

- Any page is a normal React file under `app/` — edit and save, changes appear instantly in dev
- To add a new category (e.g. Beauty & Grooming), you don't need a new table — just
  add new values to the `subcategory` field for those businesses, and add matching
  entries to the `SUBCATEGORIES` list in `components/HeroSearch.tsx` and `app/page.tsx`
- To add photos, connect Supabase Storage (a few lines of setup, documented on Supabase's site)
  and store the image URL in the `photos` field

## Admin (manually approving new listings)

New signups are created with `status: 'pending'` so they don't go live automatically.
For now, approve them by going into the Supabase Table Editor, opening the `businesses`
table, and changing a row's `status` to `active`. A proper admin dashboard page can be
built once you have enough volume that doing this manually becomes slow.

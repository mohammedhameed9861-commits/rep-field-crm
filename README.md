# Flowercom CRM

Internal tool for the sales side of the business: reps in the field, a
telesales team on the phone, and managers who need one place to see every
client account's order history and activity — plus simple stock tracking.

> The public marketing site lives in a separate repo,
> [`flowercomsite`](https://github.com/mohammedhameed9861-commits/flowercomsite)
> (root domain). Kept completely separate on purpose — different Supabase
> project, no shared backend, database, or auth. This repo is meant to sit
> on a subdomain (e.g. `crm.yourdomain.com`).

- **Frontend**: React + Vite + TypeScript + Tailwind, client-side SPA.
- **Backend**: Supabase (Postgres + Auth + Storage), Row Level Security
  enforcing every permission — not just the UI.
- **Hosting**: Cloudflare Pages (static build), same as before.

## What's built so far

**Accounts** — client shop records (name, area, phone, assigned rep, and a
shop class A/B/C based on expected weekly cartons: A = 4–6, B = 2.5–3.5,
C = 1–2), each with its full order history and a combined activity
timeline (visits + calls + orders, chronological). Managers can add new
accounts.

Everything else in the sidebar (Dashboard, Reps, Telesales, Inventory) is a
placeholder — built in that order, one at a time, next.

## How the trust model works

Same discipline as the previous implementation, carried over deliberately:

- **Roles are never client-assigned.** New sign-ups always get `role =
  'rep'` via the `handle_new_user` trigger, never from client-supplied
  signup data. Promoting someone to `telesales`/`manager` isn't built yet —
  it needs a proper admin path (an Edge Function using the service-role
  key), coming with the "Reps" section.
- **Visits, calls and orders are insert-only.** No UPDATE/DELETE policy
  exists on any of them for any role — once logged, they can't be edited
  or removed through the app. That's the account's audit trail.
- **A visit needs a photo taken in the app**, not picked from the gallery
  (the file input uses `capture="environment"`, which opens the camera
  directly on a phone). No GPS check this time — just the photo.
- **One shared `orders` table** for both a rep's visit-sourced sale and a
  telesales call-sourced sale — a `source` column plus a check constraint
  say which, and which visit/call it came from. The account's order
  history looks the same either way.

## Known gaps (intentional, for now)

- No manager-only "Manage Reps" admin screen yet — for now, create the
  first few accounts (rep/telesales/manager) directly in the Supabase
  dashboard (Authentication → Users → Add user), then set their role in
  the SQL Editor:
  ```sql
  update public.profiles set role = 'telesales' where id = '<user's UUID>';
  ```
- No visit-logging or call-logging screens yet (those are the "Reps" and
  "Telesales" sections) — so a brand-new account's order history and
  activity timeline are empty until those exist. That's expected, not a
  bug.
- No bilingual (Arabic/English) UI yet — English only for now, while the
  data model and screens are still settling. Straightforward to add once
  they are (the marketing site's i18next setup is the template).

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com) — a
   **different** project from the marketing site's.
2. SQL Editor → New query → paste and run each file in
   `supabase/migrations/` **in order** (`0001` → `0004`).
3. **Turn off public sign-ups**: Authentication → Sign In / Providers →
   turn off "Allow new users to sign up". Accounts are created directly
   in the dashboard (see "Known gaps" above), not by anyone signing up.
4. Create the first manager account: Authentication → Users → Add user →
   tick **Auto Confirm User**. Then in the SQL Editor:
   ```sql
   update public.profiles set role = 'manager' where id = '<that user's UUID>';
   ```

## 2. Configure the frontend

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
Project Settings → API. Then:

```bash
npm install
npm run dev
```

## 3. Deploy to Cloudflare Pages

1. Workers & Pages → Create → Pages → Connect to Git → this repo.
2. Build command: `npm run build` · Output directory: `dist`.
3. Add the same two environment variables as `.env`.
4. Deploy. `wrangler.jsonc` already handles SPA routing on refresh.

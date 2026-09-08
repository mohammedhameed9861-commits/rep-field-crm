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
timeline (visits + calls + orders, chronological). Managers can add,
edit, and archive/reactivate accounts (never hard-deleted), plus leave a
free-text note on each one.

**Reps** — a manager-only "Reps & Staff" screen to create staff logins
(rep/telesales/manager), deactivate/reactivate them, and reset a
password — no more creating accounts by hand in the Supabase dashboard.
Reps get their own day-to-day nav: **New Visit** (search any shop by
name, take a camera photo — no gallery uploads, mark sold/no-sale, and
log the order in the same step when it's a sale) and **My Visits** (their
own visit history with the photo, outcome, and reason).

**Telesales** — the same New Call / My Calls day-to-day nav as reps get
for visits: search any shop by name, log an outcome (order placed /
follow-up / no answer), and when an order is placed, log it in the same
step. No photo — a call has nothing to photograph.

Dashboard and Inventory are still placeholders — built in that order,
one at a time, next.

## How the trust model works

Same discipline as the previous implementation, carried over deliberately:

- **Roles are never client-assigned.** New sign-ups always get `role =
  'rep'` via the `handle_new_user` trigger, never from client-supplied
  signup data. Promoting someone to `telesales`/`manager`, deactivating a
  staff account, or resetting a password all go through the `manage-rep`
  Edge Function, which re-checks the caller is an active manager (using
  their own JWT) before ever touching the service-role key.
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

- No manager-facing telesales dashboard/reporting screen yet (the
  "Telesales" item in the manager's sidebar) — call activity already
  shows up in each account's activity timeline, just no rollup view yet.
- No bilingual (Arabic/English) UI yet — English only for now, while the
  data model and screens are still settling. Straightforward to add once
  they are (the marketing site's i18next setup is the template).

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com) — a
   **different** project from the marketing site's.
2. SQL Editor → New query → paste and run each file in
   `supabase/migrations/` **in order** (`0001` → `0008`).
3. **Turn off public sign-ups**: Authentication → Sign In / Providers →
   turn off "Allow new users to sign up". Staff accounts are created
   through the app's Reps screen (or, before the first manager exists,
   directly in the dashboard — see step 4).
4. Create the first manager account: Authentication → Users → Add user →
   tick **Auto Confirm User**. Then in the SQL Editor:
   ```sql
   update public.profiles set role = 'manager' where id = '<that user's UUID>';
   ```
   Every account created after this one, through the Reps screen, is
   handled automatically — no more manual SQL.
5. **Deploy the `manage-rep` Edge Function** (Edge Functions → Deploy new
   function → name it `manage-rep` → paste the contents of
   `supabase/functions/manage-rep/index.ts`). It needs no extra secrets —
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
   are already available to every Edge Function in the project. This
   powers the manager's Reps screen (create/deactivate/reset password).

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

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
own visit history with the photo, outcome, and reason). Managers monitor
all of it from **Visits** — every rep's visits, with the photo, shop,
outcome, and note, filterable by rep, outcome, and a calendar date range.

**Telesales** — the same New Call / My Calls day-to-day nav as reps get
for visits: search any shop by name, log an outcome (order placed /
follow-up / no answer), and an optional note for what she was told on
the call — and when an order is placed, log it in the same step. No
photo — a call has nothing to photograph. Managers get a **Telesales
Activity** rollup: every call across every agent, filterable by agent,
outcome, and a calendar date range.

**Inventory** — a manager-only screen listing every product with its
stock on hand and low-stock threshold, plus add/edit. Deliberately
simple, per the original ask: editing a product's stock is a plain
manual number, not something orders adjust automatically.

**Dashboard** — a manager's view is built around today vs. month-to-date:
today's date at the top (so it's always clear which day you're looking
at — the browser's own clock, no manual date entry anywhere in the
app), a top row (sales today, MTD sales, the monthly cartons target,
active accounts, orders today — MTD Sales carries a small ↑/↓ trend
badge, see below), an editable monthly target with a progress bar
(remaining cartons, required/day, current/day, computed from real
calendar days), a 7-day sales chart, inventory alerts (Low/Critical
counts), month-to-date cartons per rep + a combined Telesales row, a
"Needs Attention" panel (inactive high-value accounts, declining
accounts, reactivation opportunities — see thresholds below), and
today's visit/call + cartons count per rep and telesales combined. A
telesales agent gets their own personal version instead (their own
stats + recent calls). Reps don't get a dashboard — landing on `/`
sends them straight to My Visits, matching their New Visit/My
Visits-only nav.

**Month-over-month trend**: the badge next to MTD Sales compares this
month's cartons-so-far against last month's cartons over the *same*
first N days (an apples-to-apples partial-month comparison, since the
current month isn't over yet) — not "vs. next month," which isn't a
comparison that exists yet.

"Needs Attention" thresholds (all client-side, in `src/lib/dashboard.ts`,
easy to retune):
- **Inactive high-value**: an active shop class A/B account with no
  visit/call/order in 30+ days.
- **Declining**: an account with real order history whose this-month
  cartons are under 80% of last month's.
- **Reactivation opportunity**: an account that has ordered before but
  has had zero activity in 60+ days.

**Pull Data** — a manager-only export: one click downloads a single
`.xlsx` with a tab each for Accounts, Visits, Calls, Orders, Products,
and Staff — built entirely in the browser (`src/lib/exportData.ts`, via
SheetJS, loaded on demand so it doesn't bloat everyone else's page
load). The Visits and Calls tabs each carry a `Day` column plus the
linked order's items/bouquets/amount/status inline (blank when that
visit/call didn't result in a sale) — no need to cross-reference the
Orders tab by hand.

Every section from the original ask is now built.

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

## Bilingual (English/Arabic)

Same setup as the marketing site: `i18next` + `react-i18next`, resource
files at `src/i18n/locales/{en,ar}.json`, a toggle in the sidebar footer
that calls `setLanguage()` from `src/i18n/index.ts`. Switching sets
`dir`/`lang` on `<html>`, persists the choice (`flowercom_crm_lang` in
localStorage — a separate key from the site's, since they're separate
origins), and swaps the body font to Cairo for Arabic via `html[dir="rtl"]
body { font-family: "Cairo" }` in `index.css`. Layout mirrors mostly for
free — flexbox's `row` direction already follows `dir`, so the sidebar,
nav, and most rows flip automatically; a handful of spots
(dates/amounts/phone numbers embedded in translated sentences) are
explicitly pinned `dir="ltr"` so digits don't get bidi-reordered.

Every screen is translated. Adding a new one: add its strings to both
locale files (keep the key sets identical — nothing enforces that at
runtime, so a mismatched key silently falls back to the English string
via `fallbackLng`), then `useTranslation()` + `t("namespace.key")` in the
component.

## Known gaps (intentional, for now)

- **Orders aren't linked to specific products.** `orders.items` is free
  text (e.g. "Red Roses x6"), not a reference into `products` — so
  there's no way to tell which products are actually selling.
  "Aging Stock" (slow-moving product) was deliberately dropped from the
  Inventory Alerts for this reason; only Low/Critical stock-level
  thresholds are tracked. Fixing this for real means reworking the
  order-entry form to pick real products (with quantities) instead of
  typing free text — a bigger change than this round's scope.
- Everything else from the original ask is built and bilingual.

**A dependency note on Pull Data**: it uses the `xlsx` (SheetJS) npm
package, which `npm audit` flags with two high-severity advisories
(prototype pollution, ReDoS). Both are about *parsing* an untrusted
spreadsheet a user uploads — a feature this app never uses; here `xlsx`
only ever writes a file we generate ourselves from our own data, so
those advisories don't apply to how it's used. Worth knowing if this
codebase is inherited later, since `npm audit` will keep flagging it.

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com) — a
   **different** project from the marketing site's.
2. SQL Editor → New query → paste and run each file in
   `supabase/migrations/` **in order** (`0001` → `0010`).
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

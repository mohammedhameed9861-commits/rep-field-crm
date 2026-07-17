# Rep Field CRM

Mobile-first field sales tool: reps log shop visits with photo + GPS proof and
either close a sale (auto-generates an invoice) or log a no-sale reason.
Managers get a live dashboard, filterable by rep.

- **Frontend**: React + Vite + TypeScript + Tailwind, plain client-side SPA (no
  server framework) — works on any phone browser, no install.
- **Backend**: Supabase (Postgres + Auth + Storage). All authorization is
  enforced with Postgres Row Level Security, not just UI logic.
- **Hosting**: Cloudflare Pages (static build).

## How the trust model works

- **Invoices are never inserted by the client.** A Postgres trigger
  (`create_invoice_for_sale`, see `supabase/migrations/0002_functions_triggers.sql`)
  creates the invoice row automatically whenever a visit is inserted with
  `outcome = 'sold'`, copying the amount straight from that same visit row.
  There is no `invoices` INSERT policy for any client role — it's physically
  impossible for a rep to fabricate an invoice without a matching visit.
- **Roles are never client-assigned.** New Supabase Auth sign-ups always get
  `role = 'rep'` via the `handle_new_user` trigger — the role is never taken
  from client-supplied signup metadata (that would let anyone self-promote to
  manager). Only an existing manager can promote someone, via the
  `manage-rep` Edge Function.
- **Visits and photos are immutable.** There are no UPDATE/DELETE policies on
  `visits`, `invoices`, or the `visit-photos` storage bucket — once
  submitted, an audit record can't be edited or removed by a rep or manager
  through the app.
- **Rep account admin (create/deactivate/reset password/change role)** runs
  in the `manage-rep` Supabase Edge Function, because those actions need the
  service-role key (Auth admin API), which must never reach the browser. The
  function re-checks the caller is an active manager on every call.

See [Known limitation](#known-limitation) below for what this security model
does *not* protect against.

## Project structure

```
src/
  pages/rep/        NewVisit, MyVisits
  pages/manager/     Overview, Reps, RepDetail, Shops, ShopDetail, VisitDetail, ManageReps,
                     Products, InvoicePrep, Analytics, FieldMonitoring
  components/        ShopPicker, PhotoCapture, PhotoThumb, DashboardLayout, RequireRole, Button
  lib/               supabase client, auth context, geolocation, image compression, storage helpers
supabase/
  migrations/        schema, RLS policies, triggers, storage bucket + policies
  functions/manage-rep/  Edge Function for rep account admin
```

## 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com) (pick a
   region close to your reps).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in:
   ```bash
   npm install -g supabase
   supabase login
   ```
3. Link this repo to your project (find `<project-ref>` in
   Project Settings → General):
   ```bash
   supabase link --project-ref <project-ref>
   ```
4. Push the schema, RLS policies, triggers, and storage bucket:
   ```bash
   supabase db push
   ```
   This runs everything in `supabase/migrations/` in order. Alternatively,
   paste each file's contents into the Supabase SQL Editor in order
   (`0001` → `0004`) if you'd rather not use the CLI.
5. Deploy the admin Edge Function:
   ```bash
   supabase functions deploy manage-rep
   ```
   It automatically has access to `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` — no manual secret configuration needed on
   Supabase-hosted projects.
6. **Turn off public sign-ups.** In Authentication → Providers → Email,
   disable "Allow new users to sign up". Rep and manager accounts are only
   ever created by a manager via the "Manage Reps" screen (or you, for the
   first manager — see next step). This matters: leaving sign-up open would
   let anyone create an account, and while they'd only ever land with `role
   = 'rep'`, there's no reason to expose that surface at all.
7. **Bootstrap the first manager.** Create one user any way you like (e.g.
   Authentication → Users → Add user in the dashboard), then in the SQL
   Editor run:
   ```sql
   update public.profiles set role = 'manager' where id = '<that user's UUID>';
   ```
   Every manager after this one can be created directly with the manager
   role from the "Manage Reps" screen.

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

Camera capture and GPS both require a secure context — `localhost` is fine
for dev, but once deployed the site must be served over HTTPS (Cloudflare
Pages does this by default).

## 3. Deploy to Cloudflare Pages

1. Push this repo to GitHub (already done if you're reading this from the
   repo).
2. In the Cloudflare dashboard: Workers & Pages → Create → Pages → Connect
   to Git → select this repo.
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add environment variables (Settings → Environment variables), same two
   keys as `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. `public/_redirects` (`/* /index.html 200`) is already included so
   client-side routing (`/visit/new`, `/dashboard/overview`, etc.) works on
   refresh/direct link.

## 4. Seed and walk through the flow

Before handing off to real reps:

1. Create 2-3 test rep accounts from "Manage Reps".
2. On a phone, sign in as a rep and log a full visit (GPS + both photos +
   sold, then again with no-sale) to confirm camera/GPS behave on that
   device's browser.
3. Sign in as the manager and confirm the visit appears on
   `/dashboard/overview`, the rep's row in `/dashboard/reps`, the shop pin
   on `/dashboard/shops`, and the full photo/GPS/invoice detail on
   `/dashboard/visit/{id}`.

## Known limitation

GPS + photo capture deters casual cheating but is **not tamper-proof**
against a determined rep — e.g. photos taken in advance, or GPS spoofing on
a rooted/jailbroken phone. Treat this as a strong audit trail and deterrent,
not absolute proof of visit authenticity. Pair it with periodic manual
spot-checks (call the shop, compare photo backgrounds over time, watch for
suspiciously identical GPS accuracy/timestamps across visits).

`/dashboard/monitoring` automates part of that spot-check by flagging visits
in the last 60 days with implausible GPS patterns (two visits by the same
rep less than 3 minutes apart, a visit's GPS more than 300m from the shop's
recorded location, or the same rep logging near-identical GPS at two
different shops), plus shops nobody has visited in 14+ days. These are
heuristics for a manager to look into, not conclusions — a real edge case
(a shop that moved, a dense market with shops meters apart) will trip them
too.

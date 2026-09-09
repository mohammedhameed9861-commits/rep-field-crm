# Backup & recovery

The one-line principle this app is built around: **even if something goes
wrong, the business data must remain recoverable.** This page is the honest
state of that — what protects the data, what it costs to lose, and exactly
what to type to get it back.

## What can go wrong, and what covers it

| Failure | Covered by |
|---|---|
| A rep's phone loses signal mid-save | The save is one database transaction with a retry key: it either fully lands or nothing does, and a retry can't create a duplicate. The screen says clearly whether it saved. |
| Someone edits/archives the wrong record | Nothing business-critical is ever hard-deleted from the app (accounts archive, orders cancel, staff deactivate). Every edit is in `audit_log` with who/when/before/after; a manager can read the old values back. |
| A stock number is typed wrong | The old value is in `audit_log`; the change is in `inventory_movements` with its type, delta, who and when. Negative stock is refused by the database. |
| A bad migration / a bug that corrupts rows | Last night's off-site database dump (GitHub Actions artifact, kept 90 days) + the pre-migration manual run. |
| Supabase project deleted, paused, billed out, or the account lost | Same off-site dump — it is stored in GitHub, not Supabase. Photos: `scripts/backup-photos.mjs` (run periodically by a manager). |
| The whole app breaks after a deploy | Vercel keeps every previous deployment — "Promote to Production" on the last good one (Vercel → Deployments). No data is involved. |
| A manager accidentally locks everyone out | The `manage-rep` function refuses to deactivate/demote yourself or the last active manager. |

## RPO / RTO — the honest numbers

- **RPO (how much you can lose)**: **up to 24 hours** — the automated dump
  runs nightly at 02:00 UTC. Between dumps, the only copy is production.
  Supabase's own daily backup (Pro plan, $25/mo) has the same 24h window;
  its **PITR add-on** brings it to ~2 minutes. If losing a day of visits is
  unacceptable, that add-on is the fix — nothing in this repo can do better
  than the nightly dump without it.
- **RTO (how long to get back)**: **about 1 hour** of a manager's or
  developer's time following the restore steps below, assuming the dump is
  at hand. Not measured under pressure; rehearse it once (see "Rehearse").
- Photos are *not* in the nightly dump (they are files, not rows). Losing
  the storage bucket loses photos since the last `backup-photos` run.

## How the nightly backup works

`.github/workflows/backup.yml`, daily at 02:00 UTC and on demand:

1. `pg_dump` of the `public`, `auth` and `storage` schemas (custom format,
   restorable with `pg_restore`) plus a plain-SQL data-only copy of `public`
   a human can read.
2. Restores that dump into a throwaway Postgres **inside the same job** and
   compares every table's row count against production, then checks that
   orders still point at accounts, lines at orders, visits/calls at staff.
   **A backup that fails to restore fails the job.**
3. Uploads it as a workflow artifact, kept 90 days (≈90 restore points).

**A failed backup is an alert**: GitHub emails the repo owner on a failed
scheduled run. Keep Settings → Notifications → Actions enabled, and don't
mute this repo.

### One-time setup (you must do this — it does nothing until then)

1. Supabase → project → **Connect** → copy the **Session pooler** URI
   (`postgresql://postgres.<ref>:…@aws-0-….pooler.supabase.com:5432/postgres`).
   Not "Direct connection": that is IPv6-only and GitHub's runners can't
   reach it.
2. GitHub → repo → Settings → Secrets and variables → Actions → **New
   repository secret** → name `SUPABASE_DB_URL`, value = that URI.
3. Actions tab → "Database backup" → **Run workflow**. Green = you have a
   verified, restorable backup. Red = read the log; the first step tells you
   if the secret is missing.

Artifacts on a **private** repo count against GitHub's storage quota (500MB
free). A dump of this database is a few MB, so ~90 days of daily dumps fits;
if the repo is public, storage is not metered.

### The manual copies (belt and braces)

- **Pull Data → "Download full backup (JSON)"** — every table, every ID, a
  manifest with date/version/counts. Take one before any migration and keep
  it off the server (a manager's own drive). Restorable by hand (see below).
- **Pull Data → Export to Excel** — the same data for humans; not a restore
  source.
- **Photos**: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node
  scripts/backup-photos.mjs ./backups` on a trusted computer, monthly. Uses
  the service-role key (Supabase → Settings → API) — paste it for that run
  only, never into a file.

## Before every migration or infrastructure change

1. Actions → Database backup → **Run workflow**, wait for green.
2. Pull Data → Download full backup (JSON), keep the file.
3. `npm run check:migrations` locally — applies every migration to a real
   Postgres and smoke-tests the trust model. Do not paste a migration that
   fails here.
4. Apply the migration in the SQL editor. Redeploy `manage-rep` if it changed.
5. Open the app on a phone: log a test visit; check Dashboard loads.

## RESTORE — exact procedure

### A. Restore the whole database from a nightly dump

Needs: `pg_restore` 17 (same as the workflow installs), the dump file
(Actions → the run → Artifacts → download, unzip → `flowercom-crm-<date>.dump`),
and the target's Session-pooler URI.

**Into a fresh Supabase project** (the "we lost the project" case):

```bash
# 1. New project in Supabase. Do NOT run the migrations — the dump has the schema.
# 2. Restore. --clean/--if-exists drop anything the new project pre-created.
pg_restore --dbname "postgresql://postgres.<newref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  --no-owner --no-privileges --clean --if-exists \
  --schema=public flowercom-crm-<date>.dump
# 3. Staff logins (auth.users, with password hashes) — restore data only:
pg_restore --dbname "…same URI…" --no-owner --no-privileges --data-only \
  --schema=auth --table=users --table=identities flowercom-crm-<date>.dump
# 4. Storage bucket: Storage → New bucket "visit-photos" (private), then re-run
#    migration 0004's policies + 0016/0017's storage policies from the SQL editor,
#    and upload the photo backup folder with the Supabase CLI or dashboard.
# 5. Redeploy the manage-rep Edge Function (paste supabase/functions/manage-rep/index.ts).
# 6. Vercel → Environment Variables: point VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
#    at the new project, redeploy. Sign in with the old passwords.
```

Expect warnings restoring `auth`/`storage` internals that Supabase manages
itself — the workflow tolerates them for the same reason. What must be
error-free is `public`.

**Into the existing project** (the "a bug wrecked today's data" case) —
this REPLACES current data with the dump's; take a fresh backup first:

```bash
pg_restore --dbname "<prod session-pooler URI>" --no-owner --no-privileges \
  --clean --if-exists --schema=public flowercom-crm-<date>.dump
```

To bring back just one table (e.g. someone mass-edited orders):

```bash
pg_restore --dbname "<URI>" --no-owner --no-privileges --data-only \
  --table=orders --table=order_items flowercom-crm-<date>.dump
# (truncate those two tables in the SQL editor first, or you'll get duplicate-key errors)
```

### B. Restore from the JSON backup (no pg_restore available)

The file is `{ manifest, tables }`; `manifest.restore_order` is the order
that satisfies the foreign keys. In the SQL editor, for each table in that
order, insert its rows — quickest is Supabase's Table Editor → Import CSV
after converting a table's array to CSV, or a short script with
`supabase-js` and the service-role key doing `.from(table).insert(rows)` in
batches of 500. Staff logins are not in this file (see manifest note) —
recreate them from the Reps screen if Auth was lost too; profile rows carry
the same UUIDs, so recreate users **with those UUIDs** via the Auth admin
API (`createUser({ id, … })`) to keep visits/calls attached.

### C. Verify after any restore

In the SQL editor:

```sql
select 'accounts', count(*) from accounts union all
select 'visits',   count(*) from visits   union all
select 'calls',    count(*) from calls    union all
select 'orders',   count(*) from orders   union all
select 'order_items', count(*) from order_items;
-- Relationships (all should return 0):
select count(*) from orders o left join accounts a on a.id = o.account_id where a.id is null;
select count(*) from order_items i left join orders o on o.id = i.order_id where o.id is null;
select count(*) from visits v left join profiles p on p.id = v.rep_id where p.id is null;
```

Then on a phone: sign in as a rep, open My Visits (history + photos), log a
test visit; as a manager, open an account's Order History and the Dashboard.

## Rehearse

Once, on a spare free Supabase project, do procedure A start to finish with
a real nightly dump and time it. That number is the real RTO. Note it here.

Last rehearsal: _not yet done_.

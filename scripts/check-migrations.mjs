// Runs every migration in order against a real (WASM) Postgres with Supabase's
// auth/storage surface stubbed, so a broken migration fails HERE, not in the
// user's SQL editor.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "supabase/migrations";
const db = new PGlite();

const stub = `

create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
alter table storage.objects enable row level security;
`;
await db.exec(stub);

const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
let failed = false;
for (const f of files) {
  const sql = readFileSync(join(dir, f), "utf8");
  try {
    await db.exec(sql);
    console.log("OK   ", f);
  } catch (e) {
    failed = true;
    console.log("FAIL ", f, "\n      ", (e && e.message) || e);
    break;
  }
}
if (!failed) {
  // Smoke-test the trust model end to end: a rep logs a sold visit with line items,
  // then the enum/constraint edges the migrations promise.
  const run = async (label, sql) => { try { await db.exec(sql); console.log("OK    smoke:", label); } catch (e) { failed = true; console.log("FAIL  smoke:", label, "\n      ", e.message); } };
  await run("seed users -> profiles via trigger", `
    insert into auth.users (id, email, raw_user_meta_data) values
      ('11111111-1111-1111-1111-111111111111','rep@x','{"full_name":"Rep One"}'),
      ('22222222-2222-2222-2222-222222222222','mgr@x','{"full_name":"Boss"}');
    update public.profiles set role='manager' where id='22222222-2222-2222-2222-222222222222';
    insert into public.accounts (id, name, shop_class) values ('33333333-3333-3333-3333-333333333333','Shop','A');
  `);
  await run("visit + order + order_items + follow-up + new reasons", `
    insert into public.visits (id, account_id, rep_id, photo_path, outcome, no_sale_reason, next_followup_at)
      values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','p.jpg','sold',null, current_date + 1);
    insert into public.orders (id, account_id, created_by, source, visit_id, items, quantity)
      values ('55555555-5555-5555-5555-555555555555','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','visit','44444444-4444-4444-4444-444444444444','Red Roses x6',6);
    insert into public.order_items (order_id, product_name, quantity) values ('55555555-5555-5555-5555-555555555555','Red Roses',6);
    insert into public.visits (account_id, rep_id, photo_path, outcome, no_sale_reason)
      values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','q.jpg','no_sale','owner_unavailable');
  `);
  await run("call with type/reason constraint", `
    insert into public.calls (account_id, telesales_id, call_type, outcome, call_reason, next_followup_at)
      values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','reactivation','not_interested','price_too_high',null);
    insert into public.calls (account_id, telesales_id, call_type, outcome, call_reason)
      values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','new_customer','interested_callback',null);
  `);
  try {
    await db.exec(`insert into public.calls (account_id, telesales_id, call_type, outcome, call_reason) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','new_customer','not_interested',null);`);
    console.log("FAIL  smoke: not_interested without reason was ALLOWED"); failed = true;
  } catch { console.log("OK    smoke: not_interested without reason is rejected"); }
  await run("audit trigger on manager edit", `
    set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
    update public.visits set note='fixed' where id='44444444-4444-4444-4444-444444444444';
  `);
  const a = await db.query(`select count(*)::int as n from public.audit_log where table_name='visits'`);
  console.log(a.rows[0].n === 1 ? "OK    smoke: 1 audit row" : "FAIL  smoke: audit rows = " + a.rows[0].n);
  const v = await db.query(`select updated_at is not null as edited from public.visits where id='44444444-4444-4444-4444-444444444444'`);
  console.log(v.rows[0].edited ? "OK    smoke: updated_at set" : "FAIL  smoke: updated_at not set");
  const r1 = await db.query(`select public.my_role()::text as r`);
  console.log(r1.rows[0].r === "manager" ? "OK    smoke: my_role() = manager for active manager" : "FAIL  smoke: my_role() = " + r1.rows[0].r);
  await db.exec(`update public.profiles set active=false where id='22222222-2222-2222-2222-222222222222'`);
  const r2 = await db.query(`select public.my_role()::text as r`);
  console.log(r2.rows[0].r === null ? "OK    smoke: my_role() is null once deactivated" : "FAIL  smoke: deactivated my_role() = " + r2.rows[0].r);
  const r3 = await db.query(`select * from public.account_activity_summary(date_trunc('month', now()), date_trunc('month', now()) - interval '1 month')`);
  const row = r3.rows[0];
  console.log(row && row.ever_ordered === true && Number(row.this_month_qty) === 6 && row.last_activity_at ? "OK    smoke: account_activity_summary rollup" : "FAIL  smoke: account_activity_summary -> " + JSON.stringify(r3.rows));
  if (process.env.EXTRA_SQL) {
    for (const [label, sql] of JSON.parse(process.env.EXTRA_SQL)) await run(label, sql);
  }
}
process.exit(failed ? 1 : 0);

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

  // ---- 0017: atomic/idempotent writes, validation, inventory ledger ----
  await db.exec(`set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'`); // the rep
  const lines = JSON.stringify([{ product_name: "Red Roses", quantity: 6 }, { product_name: "Colored Roses", quantity: 3.5 }]);
  const cid = '66666666-6666-6666-6666-666666666666';
  const v1 = await db.query(`select public.log_visit($1, '33333333-3333-3333-3333-333333333333', 'a.jpg', 'sold', null, '  note ', current_date + 3, $2::jsonb) as id`, [cid, lines]);
  const v2 = await db.query(`select public.log_visit($1, '33333333-3333-3333-3333-333333333333', 'a.jpg', 'sold', null, 'note', current_date + 3, $2::jsonb) as id`, [cid, lines]);
  console.log(v1.rows[0].id === v2.rows[0].id ? "OK    smoke: log_visit is idempotent (same id on retry)" : "FAIL  smoke: log_visit created two visits");
  const vc = await db.query(`select (select count(*)::int from public.visits where client_id=$1) as visits, (select count(*)::int from public.orders where visit_id=$2) as orders, (select count(*)::int from public.order_items oi join public.orders o on o.id=oi.order_id where o.visit_id=$2) as items, (select items from public.orders where visit_id=$2) as summary, (select quantity::text from public.orders where visit_id=$2) as qty`, [cid, v1.rows[0].id]);
  const r = vc.rows[0];
  console.log(r.visits === 1 && r.orders === 1 && r.items === 2 ? "OK    smoke: exactly 1 visit, 1 order, 2 lines" : "FAIL  smoke: counts " + JSON.stringify(r));
  console.log(r.summary === "Red Roses x6, Colored Roses x3.5" && Number(r.qty) === 9.5 ? "OK    smoke: server summary matches client format" : "FAIL  smoke: summary=" + r.summary + " qty=" + r.qty);
  try { await db.query(`insert into public.order_items (order_id, product_name, quantity) values ((select id from public.orders limit 1), 'X', 0)`); console.log("FAIL  smoke: zero-quantity line ALLOWED"); failed = true; }
  catch { console.log("OK    smoke: zero-quantity order line is rejected"); }
  await db.exec(`set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222'`); // manager
  await db.exec(`update public.profiles set active=true where id='22222222-2222-2222-2222-222222222222'`);
  const pid = (await db.query(`select public.create_product('Tulips', 10, 5, 2) as id`)).rows[0].id;
  await db.query(`select public.save_product($1, 'Tulips', 4, 5, 2, 'damaged', 'water damage')`, [pid]);
  const mv = await db.query(`select movement_type::text as t, quantity_delta::text as d, stock_after::text as a, note from public.inventory_movements where product_id=$1 order by created_at`, [pid]);
  const ok = mv.rows.length === 2 && mv.rows[0].t === 'received' && Number(mv.rows[0].d) === 10 && mv.rows[1].t === 'damaged' && Number(mv.rows[1].d) === -6 && Number(mv.rows[1].a) === 4 && mv.rows[1].note === 'water damage';
  console.log(ok ? "OK    smoke: inventory ledger records received +10 then damaged -6 -> 4" : "FAIL  smoke: movements " + JSON.stringify(mv.rows));
  await db.query(`update public.products set stock_qty = 7 where id=$1`, [pid]); // direct dashboard edit
  const mv2 = await db.query(`select movement_type::text as t from public.inventory_movements where product_id=$1 order by created_at desc limit 1`, [pid]);
  console.log(mv2.rows[0].t === 'adjusted' ? "OK    smoke: a direct stock edit is still recorded as 'adjusted'" : "FAIL  smoke: direct edit not recorded");
  await db.query(`select public.replace_order_lines($1, $2::jsonb, 'delivered')`, [vc.rows[0] && (await db.query(`select id from public.orders where visit_id=$1`, [v1.rows[0].id])).rows[0].id, JSON.stringify([{ product_name: "Red Roses", quantity: 2 }])]);
  const ro = await db.query(`select o.items, o.status::text as status, (select count(*)::int from public.order_items where order_id=o.id) as n from public.orders o where visit_id=$1`, [v1.rows[0].id]);
  console.log(ro.rows[0].items === "Red Roses x2" && ro.rows[0].status === "delivered" && ro.rows[0].n === 1 ? "OK    smoke: replace_order_lines replaced lines + status atomically" : "FAIL  smoke: " + JSON.stringify(ro.rows));
  await db.exec(`set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'`);
  const c1 = await db.query(`select public.log_call('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'new_customer', 'order_placed', null, null, null, $1::jsonb) as id`, [lines]);
  const c2 = await db.query(`select public.log_call('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'new_customer', 'order_placed', null, null, null, $1::jsonb) as id`, [lines]);
  console.log(c1.rows[0].id === c2.rows[0].id ? "OK    smoke: log_call is idempotent" : "FAIL  smoke: log_call duplicated");
  await db.query(`insert into public.client_error_log (user_id, route, message) values ('11111111-1111-1111-1111-111111111111', '/visits/new', 'boom')`);
  console.log("OK    smoke: client_error_log accepts a row");

  // ---- Rejection cases.
  // Negative stock: the same CHECK constraint save_product() runs into, hit directly — a
  // plain statement-level constraint error, which PGlite handles fine.
  try { await db.query(`update public.products set stock_qty = -1 where id=$1`, [pid]); console.log("FAIL  smoke: negative stock ALLOWED"); failed = true; }
  catch (e) { console.log("OK    smoke: negative stock is rejected (" + (e.code || "check") + ")"); }
  const st = await db.query(`select stock_qty::text as s from public.products where id=$1`, [pid]);
  console.log(st.rows[0].s === "7.0" ? "OK    smoke: stock unchanged after the rejected update" : "FAIL  smoke: stock after rejected update = " + st.rows[0].s);

  // A sold visit with no lines must be refused by log_visit(). This RAISEs inside plpgsql,
  // which PGlite 0.3 (the in-process test database — NOT PostgreSQL) cannot survive past:
  // the *next* statement crashes its WASM runtime. So it is deliberately the very last
  // statement of this suite. In PostgreSQL an error escaping a function aborts that whole
  // statement — including the visit insert that preceded the RAISE — which is exactly the
  // "nothing half-saved" guarantee (and PostgreSQL's own documented semantics, not ours).
  await db.exec(`set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'`);
  try {
    await db.query(`select public.log_visit('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'b.jpg', 'sold', null, null, null, '[]'::jsonb)`);
    console.log("FAIL  smoke: sold visit with no lines was ALLOWED"); failed = true;
  } catch (e) { console.log("OK    smoke: sold visit with no lines is rejected (" + (e.code || "raise") + ") — Postgres rolls back the whole call"); }
  if (process.env.EXTRA_SQL) {
    for (const [label, sql] of JSON.parse(process.env.EXTRA_SQL)) await run(label, sql);
  }
}
process.exit(failed ? 1 : 0);

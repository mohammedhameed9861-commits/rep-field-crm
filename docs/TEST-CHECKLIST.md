# Test checklist

Automated (`npm run check:migrations`, runs in seconds, no setup): every
migration applies in order to a real Postgres; then the trust model and the
data-protection rules are exercised — enum swaps, the call reason rule, the
audit trigger, `my_role()` going null on deactivation, the Needs Attention
rollup, `log_visit`/`log_call` idempotency and rollback, zero-quantity and
negative-stock rejection, the inventory ledger, `replace_order_lines`.

Everything below is manual, on a phone unless it's a manager screen.
Tick each before go-live and after any migration.

## Account (manager)
- [ ] Create — appears in list; empty name refused
- [ ] Edit name/area/phone/class/assigned rep — History shows before → after
- [ ] Archive → disappears from reps' search; Reactivate → back; data intact
- [ ] Search by name and by area
- [ ] Assign rep — shows on account, and in Visits Activity

## Order
- [ ] Sold visit with 2 products → Order History shows "A x6, B x3", total 9
- [ ] Edit order (manager): change lines + status Delivered → History logs it
- [ ] Cancel (status Cancelled) — row stays, still visible, stats exclude nothing wrongly
- [ ] Quantity 0 / blank product → Save stays disabled; the database also refuses
- [ ] Double-tap Save Visit → exactly one visit and one order
- [ ] Turn airplane mode on, Save → red "No connection… NOT saved"; off, Save again → saved once

## Inventory (manager)
- [ ] Add product from Manage Types list; stock 10 → movement "received +10"
- [ ] Edit stock 10 → 4 with reason Damaged + note → movement "damaged −6 → 4"
- [ ] Try stock −1 → refused with a plain message
- [ ] Pull Data → Inventory Movements sheet lists both
- [ ] Dashboard Inventory Alerts reflect Low/Critical

## Rep
- [ ] Log visit: camera opens live (not a file picker), photo captured, Save enabled only after photo
- [ ] No-sale with reason; note; follow-up Tomorrow → appears in Upcoming Follow-ups
- [ ] Sold visit → order attached; My Visits shows Sold badge
- [ ] Failed save (airplane mode) → clear failure message; form contents kept
- [ ] Rep cannot open /accounts, /reps, /inventory, /telesales, /pull-data (manager-only text)

## Telesales
- [ ] Call type required; each outcome shows its own fields
- [ ] Not Interested without reason → Save disabled
- [ ] Interested/Call Back + Custom date → Upcoming Follow-ups
- [ ] Order Placed with lines → order on the account
- [ ] Double-tap Save Call → one call, one order

## Auth
- [ ] Wrong password → "Email or password is incorrect" (no technical text)
- [ ] Deactivate a test rep → within an hour their phone shows "account deactivated"; reactivate → back
- [ ] Manager cannot deactivate self or the last manager (clear message)
- [ ] With the anon key and a rep's token, `POST /rest/v1/accounts` is refused (RLS)
- [ ] With a rep's token, `GET /rest/v1/audit_log` returns nothing

## Backup
- [ ] Actions → Database backup → Run workflow → green; artifact downloadable
- [ ] Job log shows "Row counts identical." and "Relationships intact."
- [ ] Pull Data → Download full backup (JSON) → file opens; manifest counts match the page
- [ ] Rehearsal: restore a dump into a spare project (docs/BACKUP-AND-RECOVERY.md A) and record the time

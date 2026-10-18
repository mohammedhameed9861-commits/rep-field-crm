-- Products can't actually be deleted today (no delete policy exists for
-- any role, and a true delete would orphan inventory_movements and
-- order_items that reference the product by id). Give products the same
-- archive/restore pattern accounts already have (migration 0006) instead:
-- a manager can take a discontinued product off the active Inventory list
-- and low-stock alerts without losing its history.
alter table public.products add column active boolean not null default true;

-- Already covered by the existing "managers update products" policy
-- (migration 0003) — no new RLS or RPC needed, same as accounts.active.

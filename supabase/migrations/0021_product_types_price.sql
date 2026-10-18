-- Inventory is simplified down to a plain price list: a manager adds a
-- product's name and price, nothing else — no stock counts, no low/critical
-- thresholds, no archive. That list is also exactly what reps/telesales
-- already pick from when logging an order, so instead of keeping two
-- separate catalogs in sync (products for stock, product_types for the
-- order picker), product_types becomes the one and only list. It already
-- has the read/insert/delete policies this needs (migration 0013) and a
-- real delete (not an archive) is fine here: order_items.product_name is
-- plain text, not a foreign key, so deleting a product_type can never
-- orphan a past order's line items.
--
-- The old products/inventory_movements tables are left exactly as they are
-- — not dropped, not touched — so none of that stock history is lost; the
-- app just stops reading or writing them.
alter table public.product_types add column price numeric(10,2) not null default 0;
alter table public.product_types add constraint product_types_price_nonnegative
  check (price >= 0) not valid;

-- Only insert/delete existed before (migration 0013); editing a name or
-- price needs its own update policy.
create policy "managers update product types" on public.product_types
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

-- Same generic audit trigger every other manager-editable table uses
-- (migration 0012) — a price change shows up in "Edit history" like
-- everything else, for free.
create trigger product_types_audit after update on public.product_types
  for each row execute function public.log_audit_change();

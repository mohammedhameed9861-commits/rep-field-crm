-- An order can now cover more than one product (e.g. Red Roses x6 AND
-- Colored Roses x3 in the same visit) — exactly what migration 0001's
-- own comment on orders.items anticipated: "a proper itemized line-item
-- table can replace this later without touching anything else, since
-- nothing else reads inside `items`." That holds here too: orders.items
-- and orders.quantity stay exactly as they are (a plain summary string
-- and a total), computed and written by the app whenever it saves an
-- order's lines — nothing that only reads those two columns (Pull Data,
-- the Order History table, the activity timeline) needs to change.
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  -- Free text, same as products.name — the dropdown that fills this in is
  -- constrained to product_types, but nothing at the DB level ties the two
  -- together (same reasoning as migration 0013's product_types table).
  product_name text not null,
  quantity     numeric(10,1) not null,
  created_at   timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items(order_id);

alter table public.order_items enable row level security;

create policy "staff can read order items" on public.order_items
  for select to authenticated
  using (true);

-- A rep/telesales agent can only ever attach items to an order they just
-- created themselves (mirrors "staff log their own orders" on the parent
-- orders table) — never to someone else's order.
create policy "staff log items for their own orders" on public.order_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.created_by = auth.uid()
    )
  );

-- A manager correcting an order replaces its lines wholesale (delete then
-- re-insert) rather than patching individual rows, so this needs full CRUD.
create policy "managers manage order items" on public.order_items
  for all to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

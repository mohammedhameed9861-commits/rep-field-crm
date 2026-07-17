-- ============================================================
-- Phase 2: product catalog + itemized ordering.
--
-- A 'sold' visit now carries one or more order_items (product +
-- quantity) instead of a single manually-typed amount. The total is
-- always computed server-side from the catalog price at the moment of
-- sale (never trusted from the client), via create_sale_visit() below —
-- the only path through which a 'sold' visit can be created. Stock is
-- decremented in the same transaction, so it can never go out of sync
-- with what was actually sold.
-- ============================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  price numeric not null check (price >= 0),
  stock_quantity numeric not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_name_idx on public.products using gin (to_tsvector('simple', name));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id),
  product_id uuid not null references public.products (id),
  quantity numeric not null check (quantity > 0),
  -- Snapshot of the product's price at time of sale — later price
  -- changes must never retroactively alter a past invoice.
  unit_price numeric not null check (unit_price >= 0),
  line_total numeric generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create index order_items_visit_id_idx on public.order_items (visit_id);
create index order_items_product_id_idx on public.order_items (product_id);

alter table public.products enable row level security;
alter table public.order_items enable row level security;

create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using (true);

create policy "products_insert_manager"
  on public.products for insert
  to authenticated
  with check (public.is_manager());

create policy "products_update_manager"
  on public.products for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- No client INSERT policy — order_items are only ever created inside
-- create_sale_visit() below.
create policy "order_items_select_own_or_manager"
  on public.order_items for select
  using (
    exists (
      select 1 from public.visits v
      where v.id = order_items.visit_id
        and (v.rep_id = auth.uid() or public.is_manager())
    )
  );

-- Atomically creates a 'sold' visit together with its order items:
-- looks up each product's current price (never trusts a client-supplied
-- price), locks the row, checks stock, decrements it, and inserts the
-- visit with sale_amount = sum(quantity * price) — which in turn fires
-- the existing trg_create_invoice_for_sale trigger to create the
-- invoice. p_items is a jsonb array of {product_id, quantity}.
create or replace function public.create_sale_visit(
  p_visit_id uuid,
  p_shop_id uuid,
  p_photo_inside_url text,
  p_photo_outside_url text,
  p_gps_lat numeric,
  p_gps_lng numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_stock numeric;
  v_total numeric := 0;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one product line is required for a sale';
  end if;

  -- First pass: lock each product row, validate stock, accumulate total.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select price, stock_quantity into v_unit_price, v_stock
    from public.products
    where id = v_product_id and active = true
    for update;

    if not found then
      raise exception 'Product % not found or inactive', v_product_id;
    end if;
    if v_stock < v_quantity then
      raise exception 'Insufficient stock for product %: have %, need %', v_product_id, v_stock, v_quantity;
    end if;

    v_total := v_total + (v_unit_price * v_quantity);
  end loop;

  insert into public.visits (
    id, rep_id, shop_id, photo_inside_url, photo_outside_url, gps_lat, gps_lng, outcome, sale_amount
  ) values (
    p_visit_id, v_rep_id, p_shop_id, p_photo_inside_url, p_photo_outside_url, p_gps_lat, p_gps_lng, 'sold', v_total
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    select price into v_unit_price from public.products where id = v_product_id;

    insert into public.order_items (visit_id, product_id, quantity, unit_price)
    values (p_visit_id, v_product_id, v_quantity, v_unit_price);

    update public.products
    set stock_quantity = stock_quantity - v_quantity, updated_at = now()
    where id = v_product_id;
  end loop;

  return p_visit_id;
end;
$$;

grant execute on function public.create_sale_visit to authenticated;

-- ============================================================
-- Simplify the sold-visit flow to two independent inputs:
--   1. order_notes — free text where the rep just writes down the order
--   2. order_items — structured picks from the manager's catalog
--      (still the only thing that decrements stock)
-- Either one may be used (or both); the invoice amount is always the
-- separately-entered final amount, never derived from these.
-- ============================================================

alter table public.visits add column order_notes text;

drop function if exists public.create_sale_visit(uuid, uuid, text, text, numeric, numeric, jsonb, numeric);

create or replace function public.create_sale_visit(
  p_visit_id uuid,
  p_shop_id uuid,
  p_photo_inside_url text,
  p_photo_outside_url text,
  p_gps_lat numeric,
  p_gps_lng numeric,
  p_items jsonb,
  p_final_amount numeric,
  p_order_notes text default null
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
  v_item_count int := coalesce(jsonb_array_length(p_items), 0);
begin
  if v_rep_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_item_count = 0 and (p_order_notes is null or trim(p_order_notes) = '') then
    raise exception 'Provide order notes or at least one catalog item';
  end if;
  if p_final_amount is null or p_final_amount <= 0 then
    raise exception 'Final amount must be greater than zero';
  end if;

  -- First pass: lock each product row, validate stock.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid item line';
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
  end loop;

  insert into public.visits (
    id, rep_id, shop_id, photo_inside_url, photo_outside_url, gps_lat, gps_lng, outcome, sale_amount, order_notes
  ) values (
    p_visit_id, v_rep_id, p_shop_id, p_photo_inside_url, p_photo_outside_url, p_gps_lat, p_gps_lng, 'sold',
    p_final_amount, nullif(trim(coalesce(p_order_notes, '')), '')
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

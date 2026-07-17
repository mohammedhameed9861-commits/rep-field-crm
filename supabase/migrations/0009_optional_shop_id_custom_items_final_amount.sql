-- ============================================================
-- - shop_number becomes optional (still unique when present; Postgres
--   unique constraints already allow multiple NULLs)
-- - order_items.product_id becomes optional: a rep can add a line by
--   just typing a name that isn't in the catalog yet ("custom_name"),
--   in which case the rep supplies the price directly since there's no
--   catalog price to look up
-- - create_sale_visit() takes an explicit p_final_amount: the rep can
--   override the invoiced total (negotiated price/discount) separately
--   from the itemized lines used for stock tracking
-- ============================================================

alter table public.shops alter column shop_number drop not null;

alter table public.order_items alter column product_id drop not null;
alter table public.order_items add column custom_name text;
alter table public.order_items add constraint order_items_product_or_custom check (
  product_id is not null or custom_name is not null
);
-- unit_price for custom lines is rep-supplied (no catalog price exists);
-- relax the >=0 intent is unchanged, just no longer tied to a lookup.

-- create_sale_visit gains a new parameter (p_final_amount), so this is a
-- different overload as far as Postgres is concerned — drop the old
-- signature first so we don't end up with two ambiguous versions.
drop function if exists public.create_sale_visit(uuid, uuid, text, text, numeric, numeric, jsonb);

create or replace function public.create_sale_visit(
  p_visit_id uuid,
  p_shop_id uuid,
  p_photo_inside_url text,
  p_photo_outside_url text,
  p_gps_lat numeric,
  p_gps_lng numeric,
  p_items jsonb,
  p_final_amount numeric
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
  v_custom_name text;
  v_quantity numeric;
  v_unit_price numeric;
  v_stock numeric;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one product line is required for a sale';
  end if;
  if p_final_amount is null or p_final_amount <= 0 then
    raise exception 'Final amount must be greater than zero';
  end if;

  -- First pass: for catalog lines, lock the product row and validate
  -- stock; for custom lines, require an explicit rep-supplied price.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_custom_name := nullif(v_item ->> 'custom_name', '');
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid quantity for line %', coalesce(v_custom_name, v_product_id::text);
    end if;

    if v_product_id is not null then
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
    elsif v_custom_name is not null then
      v_unit_price := (v_item ->> 'unit_price')::numeric;
      if v_unit_price is null or v_unit_price < 0 then
        raise exception 'A unit price is required for custom item %', v_custom_name;
      end if;
    else
      raise exception 'Each line needs either a product_id or a custom_name';
    end if;
  end loop;

  insert into public.visits (
    id, rep_id, shop_id, photo_inside_url, photo_outside_url, gps_lat, gps_lng, outcome, sale_amount
  ) values (
    p_visit_id, v_rep_id, p_shop_id, p_photo_inside_url, p_photo_outside_url, p_gps_lat, p_gps_lng, 'sold', p_final_amount
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_custom_name := nullif(v_item ->> 'custom_name', '');
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_product_id is not null then
      select price into v_unit_price from public.products where id = v_product_id;

      insert into public.order_items (visit_id, product_id, quantity, unit_price)
      values (p_visit_id, v_product_id, v_quantity, v_unit_price);

      update public.products
      set stock_quantity = stock_quantity - v_quantity, updated_at = now()
      where id = v_product_id;
    else
      v_unit_price := (v_item ->> 'unit_price')::numeric;
      insert into public.order_items (visit_id, product_id, custom_name, quantity, unit_price)
      values (p_visit_id, null, v_custom_name, v_quantity, v_unit_price);
    end if;
  end loop;

  return p_visit_id;
end;
$$;

grant execute on function public.create_sale_visit to authenticated;

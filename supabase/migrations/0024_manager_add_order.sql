-- A manager logs a sale a rep (or telesales agent) forgot to enter. Every order must hang off
-- a visit or a call (orders_source_matches_link), so this creates that parent too — a "sold"
-- visit with a placeholder photo for a rep, an "order_placed" call for telesales — and
-- credits the sale to the chosen person so every dashboard count stays consistent.
-- SECURITY DEFINER because the normal insert policies only let people log their own rows;
-- the manager check below is what gates it.
create or replace function public.manager_add_order(
  p_account_id uuid,
  p_staff_id   uuid,
  p_created_at timestamptz,
  p_lines      jsonb,
  p_status     order_status default 'pending'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_role app_role;
  v_when timestamptz := coalesce(p_created_at, now());
  v_items text;
  v_qty numeric;
  v_visit_id uuid;
  v_call_id uuid;
  v_order_id uuid;
  v_note constant text := 'Entered by manager';
begin
  if public.my_role() is distinct from 'manager' then
    raise exception 'Only a manager can add an order for someone else' using errcode = '42501';
  end if;
  if v_when > now() + interval '5 minutes' then
    raise exception 'The sale date can''t be in the future' using errcode = '23514';
  end if;

  select role into v_role from public.profiles where id = p_staff_id and active;
  if v_role is null or v_role not in ('rep', 'telesales') then
    raise exception 'Pick an active rep or telesales agent' using errcode = '23514';
  end if;

  select items, quantity into v_items, v_qty from public.lines_summary(p_lines);
  if v_qty <= 0 then
    raise exception 'An order needs at least one product line' using errcode = '23514';
  end if;

  if v_role = 'rep' then
    insert into public.visits (client_id, account_id, rep_id, photo_path, outcome, note, created_at)
    values (gen_random_uuid(), p_account_id, p_staff_id, 'manual-entry', 'sold', v_note, v_when)
    returning id into v_visit_id;
    insert into public.orders (account_id, created_by, source, visit_id, items, quantity, status, created_at)
    values (p_account_id, p_staff_id, 'visit', v_visit_id, v_items, v_qty, p_status, v_when)
    returning id into v_order_id;
  else
    insert into public.calls (client_id, account_id, telesales_id, outcome, note, created_at)
    values (gen_random_uuid(), p_account_id, p_staff_id, 'order_placed', v_note, v_when)
    returning id into v_call_id;
    insert into public.orders (account_id, created_by, source, call_id, items, quantity, status, created_at)
    values (p_account_id, p_staff_id, 'call', v_call_id, v_items, v_qty, p_status, v_when)
    returning id into v_order_id;
  end if;

  insert into public.order_items (order_id, product_name, quantity, created_at)
  select v_order_id, btrim(e->>'product_name'), (e->>'quantity')::numeric, v_when
  from jsonb_array_elements(p_lines) as e
  where btrim(coalesce(e->>'product_name', '')) <> '' and (e->>'quantity')::numeric > 0;

  return v_order_id;
end;
$$;

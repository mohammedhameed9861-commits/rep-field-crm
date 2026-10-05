-- Lets a rep set/update a shop's class (A/B/C) while logging a visit — the
-- shop's class often only becomes clear once someone is actually standing in
-- it, and until now only a manager could ever change it (AccountForm).
--
-- log_visit() itself stays SECURITY INVOKER (unchanged) — it still runs as
-- the rep, so everything it already did (the visit, the order, the line
-- items) is still governed by the exact same RLS as before. Only the new,
-- narrow shop_class update needs elevated privilege, so that one update is
-- carved out into its own SECURITY DEFINER function with its own explicit
-- check — the same shape as set_account_board_column (migration 0018): a
-- rep can change a shop's class, nothing else about it, and nothing else in
-- this function can be used to bypass "managers update accounts".

create or replace function public.set_account_shop_class(p_account_id uuid, p_shop_class shop_class)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.my_role() <> 'rep' then
    raise exception 'only a rep can set a shop''s class' using errcode = '42501';
  end if;
  if not exists (select 1 from public.accounts where id = p_account_id) then
    raise exception 'no such account' using errcode = '22023';
  end if;
  update public.accounts set shop_class = p_shop_class where id = p_account_id;
end;
$$;

-- Postgres resolves functions by their full argument list, so adding a
-- trailing parameter to log_visit() with "create or replace" would silently
-- create a SECOND, overloaded log_visit() rather than replace the one
-- already in use — the old 8-argument version would keep right on existing
-- alongside it. Drop it explicitly first so there is exactly one.
drop function public.log_visit(uuid, uuid, text, visit_outcome, no_sale_reason, text, date, jsonb);

create function public.log_visit(
  p_client_id uuid,
  p_account_id uuid,
  p_photo_path text,
  p_outcome visit_outcome,
  p_no_sale_reason no_sale_reason,
  p_note text,
  p_next_followup_at date,
  p_lines jsonb default '[]'::jsonb,
  -- Optional: null means "leave the shop's class as it is". Applied last and
  -- inside the same transaction as everything else log_visit does, so a visit
  -- is never logged with the class update silently dropped, or the reverse.
  p_shop_class shop_class default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_visit_id uuid;
  v_order_id uuid;
  v_items text;
  v_qty numeric;
begin
  select id into v_visit_id from public.visits where client_id = p_client_id;
  if v_visit_id is not null then return v_visit_id; end if;

  begin
    insert into public.visits (client_id, account_id, rep_id, photo_path, outcome, no_sale_reason, note, next_followup_at)
    values (p_client_id, p_account_id, auth.uid(), p_photo_path, p_outcome, p_no_sale_reason, nullif(btrim(p_note), ''), p_next_followup_at)
    returning id into v_visit_id;
  exception when unique_violation then
    -- Two identical requests raced; the other one won. Return its row.
    select id into v_visit_id from public.visits where client_id = p_client_id;
    return v_visit_id;
  end;

  if p_outcome = 'sold' then
    select items, quantity into v_items, v_qty from public.lines_summary(p_lines);
    if v_qty <= 0 then
      raise exception 'A sold visit needs at least one product line' using errcode = '23514';
    end if;
    insert into public.orders (account_id, created_by, source, visit_id, items, quantity, status)
    values (p_account_id, auth.uid(), 'visit', v_visit_id, v_items, v_qty, 'pending')
    returning id into v_order_id;
    insert into public.order_items (order_id, product_name, quantity)
    select v_order_id, btrim(e->>'product_name'), (e->>'quantity')::numeric
    from jsonb_array_elements(p_lines) as e
    where btrim(coalesce(e->>'product_name', '')) <> '' and (e->>'quantity')::numeric > 0;
  end if;

  if p_shop_class is not null then
    perform public.set_account_shop_class(p_account_id, p_shop_class);
  end if;

  return v_visit_id;
end;
$$;

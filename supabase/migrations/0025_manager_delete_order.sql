-- A manager permanently removes a wrong order. There is no DELETE policy on orders (they were
-- insert-only), so this is a SECURITY DEFINER function gated by the manager check. The removed
-- order and its lines are written to audit_log first, so there's always a record of who deleted
-- what. If the order hangs off a visit/call that "Add sale" created (migration 0024), that
-- placeholder visit/call is removed too; a real rep's visit or call is left alone.
create or replace function public.manager_delete_order(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_order public.orders;
  v_lines jsonb;
begin
  if public.my_role() is distinct from 'manager' then
    raise exception 'Only a manager can delete an order' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;

  select coalesce(jsonb_agg(to_jsonb(oi)), '[]'::jsonb) into v_lines
  from public.order_items oi where oi.order_id = p_order_id;

  insert into public.audit_log (table_name, record_id, changed_by, before, after)
  values ('orders', p_order_id, auth.uid(),
          to_jsonb(v_order) || jsonb_build_object('lines', v_lines),
          jsonb_build_object('deleted', true));

  delete from public.orders where id = p_order_id;   -- order_items cascade

  if v_order.visit_id is not null then
    delete from public.visits where id = v_order.visit_id and photo_path = 'manual-entry';
  end if;
  if v_order.call_id is not null then
    delete from public.calls where id = v_order.call_id and note = 'Entered by manager';
  end if;
end;
$$;

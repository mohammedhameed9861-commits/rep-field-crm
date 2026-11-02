-- Total cartons and order count per rep / telesales agent over any date range (the dashboard's
-- "Sales by rep" card — month picker or all time). Staff with no orders in the range still
-- appear (0) when they're active. SECURITY INVOKER (the default), so RLS still applies.
create or replace function public.sales_by_staff(since timestamptz, until timestamptz)
returns table (id uuid, full_name text, role app_role, orders bigint, cartons numeric)
language sql
stable
set search_path = public
as $$
  select p.id, p.full_name, p.role,
         count(o.id) as orders,
         coalesce(sum(o.quantity), 0) as cartons
  from public.profiles p
  left join public.orders o
    on o.created_by = p.id and o.created_at >= since and o.created_at < until
  where p.role in ('rep', 'telesales')
  group by p.id, p.full_name, p.role, p.active
  having p.active or count(o.id) > 0
  order by cartons desc, p.full_name;
$$;

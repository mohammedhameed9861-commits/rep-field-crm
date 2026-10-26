-- Top items / top shops now take a date range (a whole month on the dashboard) instead of
-- "since a date", so past months can be browsed. Replaces the 0022 versions.

drop function if exists public.top_items(timestamptz, int);
drop function if exists public.top_shops(timestamptz, int);

create or replace function public.top_items(since timestamptz, until timestamptz, max_rows int default 5)
returns table (product_name text, total_qty numeric)
language sql
stable
set search_path = public
as $$
  select oi.product_name, sum(oi.quantity) as total_qty
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.created_at >= since and o.created_at < until
  group by oi.product_name
  order by total_qty desc
  limit max_rows;
$$;

create or replace function public.top_shops(since timestamptz, until timestamptz, max_rows int default 50)
returns table (id uuid, name text, total_qty numeric)
language sql
stable
set search_path = public
as $$
  select a.id, a.name, sum(o.quantity) as total_qty
  from public.orders o
  join public.accounts a on a.id = o.account_id
  where o.created_at >= since and o.created_at < until
  group by a.id, a.name
  order by total_qty desc
  limit max_rows;
$$;

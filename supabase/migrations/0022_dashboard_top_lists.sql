-- Dashboard "top lists": best-selling items this month, strongest shops this
-- month, and shops that haven't ordered in a while. Rolled up in the database
-- (same reasoning as migration 0016) so it doesn't hit PostgREST's 1000-row cap.
-- SECURITY INVOKER (the default), so RLS still applies.

create or replace function public.top_items(since timestamptz, max_rows int default 5)
returns table (product_name text, total_qty numeric)
language sql
stable
set search_path = public
as $$
  select oi.product_name, sum(oi.quantity) as total_qty
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.created_at >= since
  group by oi.product_name
  order by total_qty desc
  limit max_rows;
$$;

create or replace function public.top_shops(since timestamptz, max_rows int default 5)
returns table (id uuid, name text, total_qty numeric)
language sql
stable
set search_path = public
as $$
  select a.id, a.name, sum(o.quantity) as total_qty
  from public.orders o
  join public.accounts a on a.id = o.account_id
  where o.created_at >= since
  group by a.id, a.name
  order by total_qty desc
  limit max_rows;
$$;

-- Active shops whose most recent order is at least `min_days` old, oldest first.
create or replace function public.shops_not_ordering(min_days int default 10)
returns table (id uuid, name text, last_order_at timestamptz, days_since int)
language sql
stable
set search_path = public
as $$
  select a.id, a.name, lo.last_order_at,
         floor(extract(epoch from (now() - lo.last_order_at)) / 86400)::int as days_since
  from public.accounts a
  join (
    select account_id, max(created_at) as last_order_at
    from public.orders
    group by account_id
  ) lo on lo.account_id = a.id
  where a.active
    and lo.last_order_at <= now() - make_interval(days => min_days)
  order by lo.last_order_at asc;
$$;

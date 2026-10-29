-- Shops that have placed exactly one order ever, and how long ago it was — the "bought once,
-- never came back" list. Replaces the month-based first-time list in month_overview (0026).
create or replace function public.one_time_buyers()
returns table (id uuid, name text, last_order_at timestamptz, days_since int)
language sql
stable
set search_path = public
as $$
  select a.id, a.name, o.last_order_at,
         floor(extract(epoch from (now() - o.last_order_at)) / 86400)::int as days_since
  from public.accounts a
  join (
    select account_id, count(*) as n, max(created_at) as last_order_at
    from public.orders
    group by account_id
  ) o on o.account_id = a.id
  where a.active and o.n = 1
  order by o.last_order_at asc;
$$;

create or replace function public.month_overview(since timestamptz, until timestamptz)
returns jsonb
language sql
stable
set search_path = public
as $$
  with m as (
    select account_id, quantity from public.orders
    where created_at >= since and created_at < until
  ),
  areas as (
    select coalesce(nullif(btrim(a.area), ''), '') as area, sum(m.quantity) as qty
    from m join public.accounts a on a.id = m.account_id
    group by 1
  )
  select jsonb_build_object(
    'orders',  (select count(*) from m),
    'cartons', (select coalesce(sum(quantity), 0) from m),
    'by_area', (select coalesce(jsonb_agg(to_jsonb(r) order by r.qty desc), '[]'::jsonb) from areas r)
  );
$$;

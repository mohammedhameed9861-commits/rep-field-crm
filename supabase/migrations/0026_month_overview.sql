-- One rollup for the dashboard's month section: order count and cartons (-> average bouquets
-- per order), shops whose very first order fell in the month, and cartons by shop area.
-- SECURITY INVOKER (the default), so RLS still applies.
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
  firsts as (
    select a.id, a.name
    from public.accounts a
    join (select account_id, min(created_at) as first_at from public.orders group by account_id) fo
      on fo.account_id = a.id
    where fo.first_at >= since and fo.first_at < until
  ),
  areas as (
    select coalesce(nullif(btrim(a.area), ''), '') as area, sum(m.quantity) as qty
    from m join public.accounts a on a.id = m.account_id
    group by 1
  )
  select jsonb_build_object(
    'orders',     (select count(*) from m),
    'cartons',    (select coalesce(sum(quantity), 0) from m),
    'first_time', (select coalesce(jsonb_agg(to_jsonb(f) order by f.name), '[]'::jsonb) from firsts f),
    'by_area',    (select coalesce(jsonb_agg(to_jsonb(r) order by r.qty desc), '[]'::jsonb) from areas r)
  );
$$;

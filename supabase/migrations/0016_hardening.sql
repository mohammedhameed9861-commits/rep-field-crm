-- 1) Deactivating a staff account now actually locks them out.
-- Before this, profiles.active was only ever read by the UI: a deactivated
-- rep whose phone still had a session (Supabase sessions refresh themselves
-- indefinitely) kept every permission the RLS policies grant. Every policy
-- goes through my_role(), so returning null for an inactive profile refuses
-- them everywhere at once. (The manage-rep Edge Function additionally bans
-- them in Auth so the session can't refresh.)
create or replace function public.my_role()
returns app_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and active;
$$;

-- 2) The audit log is a manager's tool — it shouldn't be readable by every
-- rep with the anon key and a REST client.
drop policy "staff can read audit log" on public.audit_log;
create policy "managers read audit log" on public.audit_log
  for select to authenticated
  using (public.my_role() = 'manager');

-- 3) Indexes for the queries that grow with every day of use. Nothing here
-- changes behaviour; it keeps "My Visits", "My Calls", the dashboard and
-- the follow-up lists fast once there are tens of thousands of rows.
create index if not exists visits_rep_created_idx on public.visits (rep_id, created_at desc);
create index if not exists calls_telesales_created_idx on public.calls (telesales_id, created_at desc);
create index if not exists visits_created_idx on public.visits (created_at desc);
create index if not exists calls_created_idx on public.calls (created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists visits_followup_idx on public.visits (rep_id, next_followup_at)
  where next_followup_at is not null;
create index if not exists calls_followup_idx on public.calls (telesales_id, next_followup_at)
  where next_followup_at is not null;

-- 4) "Needs Attention" used to download EVERY visit, call and order into the
-- browser and work it out there. PostgREST silently caps any request at
-- 1000 rows, so once the team had logged ~1000 visits the dashboard would
-- have started computing "last activity" from a truncated set and flagging
-- perfectly active shops as inactive. This does the per-account rollup in
-- the database instead and returns one row per active account, whatever the
-- history size. SECURITY INVOKER (the default), so RLS still applies.
create or replace function public.account_activity_summary(
  this_month_start timestamptz,
  last_month_start timestamptz
)
returns table (
  id               uuid,
  name             text,
  shop_class       shop_class,
  last_activity_at timestamptz,
  ever_ordered     boolean,
  this_month_qty   numeric,
  last_month_qty   numeric
)
language sql
stable
set search_path = public
as $$
  with acts as (
    select account_id, created_at from public.visits
    union all
    select account_id, created_at from public.calls
    union all
    select account_id, created_at from public.orders
  ),
  last_act as (
    select account_id, max(created_at) as last_activity_at from acts group by account_id
  ),
  qty as (
    select
      account_id,
      sum(quantity) filter (where created_at >= this_month_start) as this_month_qty,
      sum(quantity) filter (where created_at >= last_month_start and created_at < this_month_start) as last_month_qty
    from public.orders
    group by account_id
  )
  select
    a.id,
    a.name,
    a.shop_class,
    la.last_activity_at,
    (qty.account_id is not null) as ever_ordered,
    coalesce(qty.this_month_qty, 0) as this_month_qty,
    coalesce(qty.last_month_qty, 0) as last_month_qty
  from public.accounts a
  left join last_act la on la.account_id = a.id
  left join qty on qty.account_id = a.id
  where a.active;
$$;

-- 5) Photos could be uploaded but never removed by anyone — a manager needs
-- to be able to clear out old ones once storage fills up.
create policy "managers delete visit photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'visit-photos' and public.my_role() = 'manager');

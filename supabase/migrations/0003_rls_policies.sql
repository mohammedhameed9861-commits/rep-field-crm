-- Row Level Security for every table. Every permission is enforced here,
-- not just in the UI — the same trust-model discipline as the CRM's
-- previous implementation: roles are never client-writable, and the
-- audit-trail tables (visits, calls, orders) are insert-only.

-- security definer + owned by the migration role (which bypasses RLS)
-- lets this read profiles without recursing into profiles' own RLS policy.
create or replace function public.my_role()
returns app_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.visits enable row level security;
alter table public.calls enable row level security;
alter table public.orders enable row level security;
alter table public.products enable row level security;

-- profiles: everyone can read their own row; managers can read every row
-- (needed to show rep/telesales names throughout the app). No client
-- INSERT/UPDATE/DELETE at all — rows are created only by the
-- handle_new_user trigger; role changes wait for a proper manager-only
-- admin path (see README).
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.my_role() = 'manager');

-- accounts: any signed-in staff member can see every account (rep,
-- telesales and manager all need this for the account view). Only
-- managers can create or edit an account.
create policy "staff can read accounts" on public.accounts
  for select to authenticated
  using (true);

create policy "managers manage accounts" on public.accounts
  for insert to authenticated
  with check (public.my_role() = 'manager');

create policy "managers update accounts" on public.accounts
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

-- visits: visible to any signed-in staff member (account history is
-- shared); only a rep can log one, and only as themselves. Immutable —
-- no update/delete policy exists for any role.
create policy "staff can read visits" on public.visits
  for select to authenticated
  using (true);

create policy "reps log their own visits" on public.visits
  for insert to authenticated
  with check (rep_id = auth.uid() and public.my_role() = 'rep');

-- calls: same shape as visits, for telesales.
create policy "staff can read calls" on public.calls
  for select to authenticated
  using (true);

create policy "telesales log their own calls" on public.calls
  for insert to authenticated
  with check (telesales_id = auth.uid() and public.my_role() = 'telesales');

-- orders: visible to any signed-in staff member; created only by the
-- person who made the sale (rep for a visit-sourced order, telesales for
-- a call-sourced one — a manager may log either). Immutable, like visits
-- and calls — status changes are a later feature, not a client UPDATE.
create policy "staff can read orders" on public.orders
  for select to authenticated
  using (true);

create policy "staff log their own orders" on public.orders
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (source = 'visit' and public.my_role() in ('rep', 'manager'))
      or (source = 'call' and public.my_role() in ('telesales', 'manager'))
    )
  );

-- products: visible to all staff; only a manager adjusts stock.
create policy "staff can read products" on public.products
  for select to authenticated
  using (true);

create policy "managers manage products" on public.products
  for insert to authenticated
  with check (public.my_role() = 'manager');

create policy "managers update products" on public.products
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

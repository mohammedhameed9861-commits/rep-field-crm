-- Lets a manager directly edit visits, calls, and orders — reversing the
-- original insert-only-forever rule for those three tables, on the explicit
-- ask that management be able to correct mistakes. To keep this safe rather
-- than a silent overwrite, every UPDATE on the tables a manager can edit
-- (visits, calls, orders, accounts, products) is captured automatically by
-- a trigger into audit_log — application code never has to remember to log
-- anything, and a manager editing a row outside the app (e.g. the Supabase
-- dashboard) still gets logged the same way.

-- A plain "was this edited" flag, cheaper than querying audit_log just to
-- show an "(edited)" badge — the actual before/after values still live in
-- audit_log, fetched only when someone clicks to see the history.
alter table public.visits add column updated_at timestamptz;
alter table public.calls add column updated_at timestamptz;
alter table public.orders add column updated_at timestamptz;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger visits_set_updated_at before update on public.visits
  for each row execute function public.set_updated_at();
create trigger calls_set_updated_at before update on public.calls
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  record_id   uuid not null,
  changed_by  uuid references public.profiles(id),
  changed_at  timestamptz not null default now(),
  before      jsonb not null,
  after       jsonb not null
);

create index audit_log_table_record_idx on public.audit_log(table_name, record_id, changed_at desc);

alter table public.audit_log enable row level security;

create policy "staff can read audit log" on public.audit_log
  for select to authenticated
  using (true);

-- No client insert policy on audit_log at all — every row comes from the
-- trigger below, which runs as security definer (bypasses RLS the same way
-- public.my_role() does), never from the app directly.
create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_log (table_name, record_id, changed_by, before, after)
  values (tg_table_name, old.id, auth.uid(), to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create trigger visits_audit after update on public.visits
  for each row execute function public.log_audit_change();
create trigger calls_audit after update on public.calls
  for each row execute function public.log_audit_change();
create trigger orders_audit after update on public.orders
  for each row execute function public.log_audit_change();
create trigger accounts_audit after update on public.accounts
  for each row execute function public.log_audit_change();
create trigger products_audit after update on public.products
  for each row execute function public.log_audit_change();
create trigger profiles_audit after update on public.profiles
  for each row execute function public.log_audit_change();

-- visits/calls/orders were insert-only for any role — add a manager-only
-- UPDATE policy. Insert-only for reps/telesales themselves is unchanged:
-- they still can't edit their own past entries, only a manager can.
create policy "managers edit visits" on public.visits
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

create policy "managers edit calls" on public.calls
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

create policy "managers edit orders" on public.orders
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

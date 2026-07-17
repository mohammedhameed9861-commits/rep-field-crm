-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.visits enable row level security;
alter table public.invoices enable row level security;

-- profiles: rep reads/updates only their own row; manager reads all.
-- No client-facing INSERT policy — rows are created only by the
-- handle_new_user trigger (SECURITY DEFINER, bypasses RLS).
create policy "profiles_select_own_or_manager"
  on public.profiles for select
  using (auth.uid() = id or public.is_manager());

create policy "profiles_update_own_or_manager"
  on public.profiles for update
  using (auth.uid() = id or public.is_manager())
  with check (auth.uid() = id or public.is_manager());

-- shops: any authenticated rep can read and create; manager reads all.
-- created_by must be the caller — prevents attributing a shop to someone
-- else. No update/delete policy: shop records are append-only from the
-- client.
create policy "shops_select_authenticated"
  on public.shops for select
  to authenticated
  using (true);

create policy "shops_insert_own"
  on public.shops for insert
  to authenticated
  with check (created_by = auth.uid());

-- visits: rep can insert/read only their own; manager reads all.
-- No update/delete policy — a visit is an immutable audit record once
-- submitted.
create policy "visits_select_own_or_manager"
  on public.visits for select
  using (rep_id = auth.uid() or public.is_manager());

create policy "visits_insert_own"
  on public.visits for insert
  to authenticated
  with check (rep_id = auth.uid());

-- invoices: rep can read invoices tied to their own visits; manager reads
-- all. Deliberately NO insert/update/delete policy for any client role —
-- invoices exist only via the create_invoice_for_sale trigger.
create policy "invoices_select_own_or_manager"
  on public.invoices for select
  using (rep_id = auth.uid() or public.is_manager());

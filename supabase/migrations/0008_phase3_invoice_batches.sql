-- ============================================================
-- Phase 3: invoice batching for management.
--
-- A manager reviews a rep's not-yet-batched invoices and moves some
-- into a batch (the "send to inventory tomorrow" pile). A batch moves
-- draft -> prepared -> sent; once prepared, its contents are locked
-- (no more add/remove) so the printed/exported manifest always matches
-- what was actually prepared.
-- ============================================================

create table public.invoice_batches (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id),
  status text not null default 'draft' check (status in ('draft', 'prepared', 'sent')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  prepared_at timestamptz,
  sent_at timestamptz
);

create index invoice_batches_rep_id_idx on public.invoice_batches (rep_id);

create table public.invoice_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.invoice_batches (id) on delete cascade,
  invoice_id uuid not null unique references public.invoices (id),
  created_at timestamptz not null default now()
);

create index invoice_batch_items_batch_id_idx on public.invoice_batch_items (batch_id);

alter table public.invoice_batches enable row level security;
alter table public.invoice_batch_items enable row level security;

-- Manager-only workflow tool — reps never need to see batching state.
create policy "invoice_batches_manager_all"
  on public.invoice_batches for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy "invoice_batch_items_manager_all"
  on public.invoice_batch_items for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Once a batch is prepared or sent, its item list is locked — no more
-- add/remove, so what was printed/exported can never silently drift.
create or replace function public.prevent_batch_item_change_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid := coalesce(new.batch_id, old.batch_id);
  v_status text;
begin
  select status into v_status from public.invoice_batches where id = v_batch_id;
  if v_status is distinct from 'draft' then
    raise exception 'Cannot modify items of a batch that is not in draft status';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_prevent_batch_item_change_when_locked
before insert or update or delete on public.invoice_batch_items
for each row execute function public.prevent_batch_item_change_when_locked();

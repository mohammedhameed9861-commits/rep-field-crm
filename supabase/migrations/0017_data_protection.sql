-- Data-protection round. Goal: "even if something goes wrong, the business
-- data stays consistent and recoverable."
--
--   1. Idempotent, atomic writes for the two things reps/agents do all day
--      (log a visit / log a call): one transaction, and a client-supplied key
--      so a retry, a double-tap, or a flaky connection can never create the
--      same visit or order twice.
--   2. Database-level validation so bad numbers can't be stored no matter
--      which client sends them.
--   3. An inventory movement ledger: stock is never silently overwritten —
--      every change is recorded with type, delta, who, and when.
--   4. A client error log so "something went wrong" on a phone is visible to
--      a manager afterwards.

-- ---------------------------------------------------------------------------
-- 1a) Idempotency keys
-- ---------------------------------------------------------------------------
alter table public.visits add column client_id uuid unique;
alter table public.calls  add column client_id uuid unique;

-- ---------------------------------------------------------------------------
-- 2) Validation the UI already does, now enforced where it can't be bypassed.
-- NOT VALID = enforced for every new/changed row, without refusing to run if
-- some historical row happens to violate it (nothing in this app should, but
-- a migration must never fail half-way over old data).
-- ---------------------------------------------------------------------------
alter table public.order_items add constraint order_items_quantity_positive
  check (quantity > 0) not valid;
alter table public.orders add constraint orders_quantity_nonnegative
  check (quantity >= 0) not valid;
alter table public.products add constraint products_stock_nonnegative
  check (stock_qty >= 0) not valid;
alter table public.products add constraint products_thresholds_nonnegative
  check (low_stock_threshold >= 0 and critical_threshold >= 0) not valid;
alter table public.accounts add constraint accounts_name_not_blank
  check (length(btrim(name)) > 0) not valid;
alter table public.profiles add constraint profiles_name_not_blank
  check (length(btrim(full_name)) > 0) not valid;
alter table public.product_types add constraint product_types_name_not_blank
  check (length(btrim(name)) > 0) not valid;

-- ---------------------------------------------------------------------------
-- 3) Inventory movement ledger
-- ---------------------------------------------------------------------------
create type public.inventory_movement_type as enum (
  'received', 'sold', 'damaged', 'returned', 'adjusted'
);

create table public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id),
  movement_type  inventory_movement_type not null,
  quantity_delta numeric(10,1) not null,
  stock_after    numeric(10,1) not null,
  note           text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);

alter table public.inventory_movements enable row level security;
create policy "managers read inventory movements" on public.inventory_movements
  for select to authenticated
  using (public.my_role() = 'manager');
-- No client insert/update/delete policy: rows come only from the trigger below.

-- Every stock change on products — through the app, or straight in the
-- Supabase dashboard — lands here. The app passes the *kind* of movement via
-- transaction-local settings (see save_product); anything else is 'adjusted'.
create or replace function public.record_inventory_movement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_type text := nullif(current_setting('app.movement_type', true), '');
  v_note text := nullif(current_setting('app.movement_note', true), '');
  v_delta numeric(10,1);
begin
  if tg_op = 'INSERT' then
    if new.stock_qty = 0 then return new; end if;
    v_delta := new.stock_qty;
    v_type := coalesce(v_type, 'received');
  else
    if new.stock_qty = old.stock_qty then return new; end if;
    v_delta := new.stock_qty - old.stock_qty;
    v_type := coalesce(v_type, 'adjusted');
  end if;
  insert into public.inventory_movements (product_id, movement_type, quantity_delta, stock_after, note, created_by)
  values (new.id, v_type::inventory_movement_type, v_delta, new.stock_qty, v_note, auth.uid());
  return new;
end;
$$;

create trigger products_record_movement
  after insert or update on public.products
  for each row execute function public.record_inventory_movement();

-- The app's only write paths for products. SECURITY INVOKER, so the manager-
-- only RLS policies on products still decide who may call these.
create or replace function public.create_product(
  p_name text, p_stock numeric, p_low numeric, p_critical numeric,
  p_movement_type inventory_movement_type default 'received', p_note text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid;
begin
  perform set_config('app.movement_type', p_movement_type::text, true);
  perform set_config('app.movement_note', coalesce(p_note, ''), true);
  insert into public.products (name, stock_qty, low_stock_threshold, critical_threshold)
  values (btrim(p_name), p_stock, p_low, p_critical)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.save_product(
  p_id uuid, p_name text, p_stock numeric, p_low numeric, p_critical numeric,
  p_movement_type inventory_movement_type default 'adjusted', p_note text default null
)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('app.movement_type', p_movement_type::text, true);
  perform set_config('app.movement_note', coalesce(p_note, ''), true);
  update public.products
     set name = btrim(p_name), stock_qty = p_stock,
         low_stock_threshold = p_low, critical_threshold = p_critical
   where id = p_id;
  if not found then raise exception 'Product not found' using errcode = 'P0002'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1b) Atomic + idempotent "log a visit" / "log a call"
--
-- Before: the app did photo upload → insert visit → insert order → insert
-- order_items as four separate requests. A dropped connection between any two
-- left a "sold" visit with no order, or an order with no line rows. Now the
-- database side is one transaction: it all lands or none of it does.
--
-- p_client_id is generated by the form once, and reused on every retry. If the
-- first attempt actually succeeded but the phone never got the reply, the
-- retry finds the existing row and returns it instead of logging it again.
-- SECURITY INVOKER: every insert still has to pass the caller's RLS policies
-- (rep_id/telesales_id/created_by must be auth.uid(), and the role must match).
-- ---------------------------------------------------------------------------
create or replace function public.lines_summary(p_lines jsonb)
returns table (items text, quantity numeric)
language sql immutable
as $$
  with l as (
    select btrim(e.elem->>'product_name') as product_name,
           (e.elem->>'quantity')::numeric as quantity,
           e.ord
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) with ordinality as e(elem, ord)
  )
  select
    coalesce(string_agg(product_name || ' x' || rtrim(rtrim(quantity::text, '0'), '.'), ', ' order by ord), ''),
    coalesce(sum(quantity), 0)
  from l
  where product_name is not null and product_name <> '' and quantity > 0;
$$;

create or replace function public.log_visit(
  p_client_id uuid,
  p_account_id uuid,
  p_photo_path text,
  p_outcome visit_outcome,
  p_no_sale_reason no_sale_reason,
  p_note text,
  p_next_followup_at date,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_visit_id uuid;
  v_order_id uuid;
  v_items text;
  v_qty numeric;
begin
  select id into v_visit_id from public.visits where client_id = p_client_id;
  if v_visit_id is not null then return v_visit_id; end if;

  begin
    insert into public.visits (client_id, account_id, rep_id, photo_path, outcome, no_sale_reason, note, next_followup_at)
    values (p_client_id, p_account_id, auth.uid(), p_photo_path, p_outcome, p_no_sale_reason, nullif(btrim(p_note), ''), p_next_followup_at)
    returning id into v_visit_id;
  exception when unique_violation then
    -- Two identical requests raced; the other one won. Return its row.
    select id into v_visit_id from public.visits where client_id = p_client_id;
    return v_visit_id;
  end;

  if p_outcome = 'sold' then
    select items, quantity into v_items, v_qty from public.lines_summary(p_lines);
    if v_qty <= 0 then
      raise exception 'A sold visit needs at least one product line' using errcode = '23514';
    end if;
    insert into public.orders (account_id, created_by, source, visit_id, items, quantity, status)
    values (p_account_id, auth.uid(), 'visit', v_visit_id, v_items, v_qty, 'pending')
    returning id into v_order_id;
    insert into public.order_items (order_id, product_name, quantity)
    select v_order_id, btrim(e->>'product_name'), (e->>'quantity')::numeric
    from jsonb_array_elements(p_lines) as e
    where btrim(coalesce(e->>'product_name', '')) <> '' and (e->>'quantity')::numeric > 0;
  end if;

  return v_visit_id;
end;
$$;

create or replace function public.log_call(
  p_client_id uuid,
  p_account_id uuid,
  p_call_type call_type,
  p_outcome call_outcome,
  p_call_reason call_reason,
  p_note text,
  p_next_followup_at date,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_call_id uuid;
  v_order_id uuid;
  v_items text;
  v_qty numeric;
begin
  select id into v_call_id from public.calls where client_id = p_client_id;
  if v_call_id is not null then return v_call_id; end if;

  begin
    insert into public.calls (client_id, account_id, telesales_id, call_type, outcome, call_reason, note, next_followup_at)
    values (p_client_id, p_account_id, auth.uid(), p_call_type, p_outcome, p_call_reason, nullif(btrim(p_note), ''), p_next_followup_at)
    returning id into v_call_id;
  exception when unique_violation then
    select id into v_call_id from public.calls where client_id = p_client_id;
    return v_call_id;
  end;

  if p_outcome = 'order_placed' then
    select items, quantity into v_items, v_qty from public.lines_summary(p_lines);
    if v_qty <= 0 then
      raise exception 'A placed order needs at least one product line' using errcode = '23514';
    end if;
    insert into public.orders (account_id, created_by, source, call_id, items, quantity, status)
    values (p_account_id, auth.uid(), 'call', v_call_id, v_items, v_qty, 'pending')
    returning id into v_order_id;
    insert into public.order_items (order_id, product_name, quantity)
    select v_order_id, btrim(e->>'product_name'), (e->>'quantity')::numeric
    from jsonb_array_elements(p_lines) as e
    where btrim(coalesce(e->>'product_name', '')) <> '' and (e->>'quantity')::numeric > 0;
  end if;

  return v_call_id;
end;
$$;

-- A manager's order correction: summary, total, status and every line change
-- together or not at all (was: update, then delete lines, then insert lines).
create or replace function public.replace_order_lines(
  p_order_id uuid, p_lines jsonb, p_status order_status
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_items text;
  v_qty numeric;
begin
  select items, quantity into v_items, v_qty from public.lines_summary(p_lines);
  if v_qty <= 0 then
    raise exception 'An order needs at least one product line' using errcode = '23514';
  end if;
  update public.orders set items = v_items, quantity = v_qty, status = p_status where id = p_order_id;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  delete from public.order_items where order_id = p_order_id;
  insert into public.order_items (order_id, product_name, quantity)
  select p_order_id, btrim(e->>'product_name'), (e->>'quantity')::numeric
  from jsonb_array_elements(p_lines) as e
  where btrim(coalesce(e->>'product_name', '')) <> '' and (e->>'quantity')::numeric > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Client error log — the phone shows a friendly message; the technical
-- one lands here so a manager can see what actually failed, and for whom.
-- ---------------------------------------------------------------------------
create table public.client_error_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id),
  route      text,
  message    text not null,
  details    jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);
create index client_error_log_created_idx on public.client_error_log (created_at desc);

alter table public.client_error_log enable row level security;
create policy "staff log their own client errors" on public.client_error_log
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "managers read client errors" on public.client_error_log
  for select to authenticated
  using (public.my_role() = 'manager');

-- ---------------------------------------------------------------------------
-- 5) A retried visit re-uploads its photo to the same path (upsert) rather
-- than leaving a second copy behind — which needs the uploader to be allowed
-- to overwrite their own object. Only their own: owner is set by Storage.
-- ---------------------------------------------------------------------------
create policy "reps replace their own visit photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'visit-photos' and public.my_role() = 'rep' and owner = auth.uid())
  with check (bucket_id = 'visit-photos' and public.my_role() = 'rep' and owner = auth.uid());

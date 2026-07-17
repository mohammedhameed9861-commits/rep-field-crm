-- ============================================================
-- Rep Field CRM — core schema
-- ============================================================

create extension if not exists pgcrypto;

-- Profiles (extends auth.users). Row is created by the handle_new_user
-- trigger below with role defaulting to 'rep' — clients can never insert
-- or self-assign a role directly (see 0003_rls_policies.sql).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('rep', 'manager')) default 'rep',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Shops (created on first visit, reused after)
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  shop_number text not null unique,
  lat numeric,
  lng numeric,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Visits (core table — one row per rep visit, immutable once created)
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id),
  shop_id uuid not null references public.shops (id),
  visit_time timestamptz not null default now(),
  photo_inside_url text not null,
  photo_outside_url text not null,
  gps_lat numeric not null,
  gps_lng numeric not null,
  outcome text not null check (outcome in ('sold', 'no_sale')),
  sale_amount numeric check (sale_amount > 0),
  no_sale_reason text check (
    no_sale_reason in ('price', 'no_stock_need', 'competitor', 'closed', 'owner_absent', 'other')
  ),
  no_sale_note text,
  created_at timestamptz not null default now(),
  -- DB-level guarantee that a 'sold' visit always carries an amount and no
  -- no-sale reason, and vice versa — the invoice trigger relies on this.
  constraint visits_outcome_consistency check (
    (outcome = 'sold' and sale_amount is not null and no_sale_reason is null)
    or
    (outcome = 'no_sale' and no_sale_reason is not null and sale_amount is null)
  )
);

create index visits_rep_id_idx on public.visits (rep_id);
create index visits_shop_id_idx on public.visits (shop_id);
create index visits_visit_time_idx on public.visits (visit_time desc);

-- Invoices (created automatically when outcome = 'sold' — see trigger in
-- 0002_functions_triggers.sql. Never inserted directly by clients.)
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity,
  visit_id uuid not null unique references public.visits (id),
  rep_id uuid not null references public.profiles (id),
  shop_id uuid not null references public.shops (id),
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index invoices_rep_id_idx on public.invoices (rep_id);
create index invoices_shop_id_idx on public.invoices (shop_id);

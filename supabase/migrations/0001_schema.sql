-- Flowercom CRM — core schema.
-- This project's own Supabase project. Never shared with the marketing
-- site's or anything else — no cross-project reads or writes, ever.

create type public.app_role as enum ('rep', 'telesales', 'manager');
create type public.shop_class as enum ('A', 'B', 'C');
create type public.visit_outcome as enum ('sold', 'no_sale');
create type public.call_outcome as enum ('order_placed', 'follow_up', 'no_answer');
create type public.order_source as enum ('visit', 'call');
create type public.order_status as enum ('pending', 'delivered', 'cancelled');

-- One row per signed-in user (rep, telesales agent, or manager).
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       app_role not null default 'rep',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Client shops.
create table public.accounts (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  area             text,
  phone            text,
  shop_class       shop_class,
  assigned_rep_id  uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);

-- A rep's field visit to a shop. photo_path is required — no visit without
-- a camera photo (enforced in the app: capture-only input, no gallery pick).
create table public.visits (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id),
  rep_id      uuid not null references public.profiles(id),
  photo_path  text not null,
  outcome     visit_outcome not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- A telesales agent's call to a shop.
create table public.calls (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id),
  telesales_id  uuid not null references public.profiles(id),
  outcome       call_outcome not null,
  note          text,
  created_at    timestamptz not null default now()
);

-- One shared order table for both field visits and telesales calls — the
-- source column plus the matching visit_id/call_id say which produced it.
-- items is a plain text summary for now (e.g. "Red Roses x6, Colored Roses
-- x3") — a proper itemized line-item table can replace this later without
-- touching anything else, since nothing else reads inside `items`.
create table public.orders (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id),
  created_by  uuid not null references public.profiles(id),
  source      order_source not null,
  visit_id    uuid references public.visits(id),
  call_id     uuid references public.calls(id),
  items       text not null,
  amount      numeric(12,2) not null default 0,
  status      order_status not null default 'pending',
  created_at  timestamptz not null default now(),
  constraint orders_source_matches_link check (
    (source = 'visit' and visit_id is not null and call_id is null) or
    (source = 'call'  and call_id  is not null and visit_id is null)
  )
);

-- Simple inventory — a running stock count per product, no batches/lots.
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  stock_qty           numeric(10,1) not null default 0,
  low_stock_threshold numeric(10,1) not null default 0,
  created_at          timestamptz not null default now()
);

create index visits_account_id_idx on public.visits(account_id);
create index calls_account_id_idx on public.calls(account_id);
create index orders_account_id_idx on public.orders(account_id);

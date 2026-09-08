-- 1) Replace the no-sale reason list with a fuller, more useful set.
-- Postgres can't drop/reorder enum values in place, so: new type, migrate
-- the data across with a mapping from the old values, swap it in.
create type public.no_sale_reason_new as enum (
  'no_need_today',
  'price_too_high',
  'bought_competitor',
  'no_stock_needed',
  'quality_concern',
  'shop_closed',
  'owner_unavailable',
  'payment_issue',
  'other'
);

alter table public.visits add column no_sale_reason_new no_sale_reason_new;

-- Disable the audit/updated_at triggers (from migration 0012) for this one
-- statement — this is a data migration, not a manager editing a row, and
-- shouldn't mark every existing visit "(edited)" or spam audit_log.
alter table public.visits disable trigger visits_set_updated_at;
alter table public.visits disable trigger visits_audit;

update public.visits set no_sale_reason_new = (case no_sale_reason
  when 'closed' then 'shop_closed'
  when 'not_interested' then 'no_need_today'
  when 'already_stocked' then 'no_stock_needed'
  when 'other' then 'other'
  else null
end)::text::no_sale_reason_new;

alter table public.visits enable trigger visits_set_updated_at;
alter table public.visits enable trigger visits_audit;

alter table public.visits drop constraint visits_no_sale_reason_matches_outcome;
alter table public.visits drop column no_sale_reason;
alter table public.visits rename column no_sale_reason_new to no_sale_reason;

drop type public.no_sale_reason;
alter type public.no_sale_reason_new rename to no_sale_reason;

alter table public.visits add constraint visits_no_sale_reason_matches_outcome check (
  (outcome = 'sold' and no_sale_reason is null) or
  (outcome = 'no_sale' and no_sale_reason is not null)
);

-- 2) "Next follow-up" on both a visit and a call — a plain date a rep/
-- telesales agent (or a manager correcting one) sets when logging it, so
-- "My Visits"/"My Calls" can surface what's coming up without any
-- separate task system.
alter table public.visits add column next_followup_at date;
alter table public.calls add column next_followup_at date;

-- 3) A manager-curated picklist of product types, so "Add Product" no
-- longer means retyping a name that might come out as "Red Rose" one time
-- and "red roses" the next. Existing products.name stays free text and
-- untouched — this only feeds the picker when creating a *new* product.
create table public.product_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

alter table public.product_types enable row level security;

create policy "staff can read product types" on public.product_types
  for select to authenticated
  using (true);

create policy "managers manage product types" on public.product_types
  for insert to authenticated
  with check (public.my_role() = 'manager');

create policy "managers delete product types" on public.product_types
  for delete to authenticated
  using (public.my_role() = 'manager');

-- Track bouquet/carton quantity per order, separate from the money amount.
-- "Lifetime Value" on the account screen counts this, not IQD — a more
-- useful number for a flower distributor than a currency total.
alter table public.orders add column quantity numeric(10,1) not null default 0;

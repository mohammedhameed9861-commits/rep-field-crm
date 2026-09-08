-- A second, lower threshold — "critical" — below the existing low-stock one.
-- stock_qty <= low_stock_threshold is "low"; stock_qty <= critical_threshold
-- is the more urgent subset of that same set (critical_threshold should be
-- set at or below low_stock_threshold, but that's a data-entry convention,
-- not something enforced here).
alter table public.products add column critical_threshold numeric(10,1) not null default 0;

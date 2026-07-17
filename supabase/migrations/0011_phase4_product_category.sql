-- Phase 4: product categories, used for the manager analytics "sales by
-- category" breakdown. Free text (not an enum) since the catalog is
-- managed entirely by the manager via bulk import / manual entry.

alter table public.products add column category text;

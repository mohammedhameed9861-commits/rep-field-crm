-- Fixed pick-list for why a visit didn't result in a sale, plus the
-- existing visits.note column still carries free text alongside it
-- (e.g. reason = 'other', note = 'renovating, come back next month').
create type public.no_sale_reason as enum ('closed', 'not_interested', 'already_stocked', 'other');

alter table public.visits add column no_sale_reason no_sale_reason;

alter table public.visits add constraint visits_no_sale_reason_matches_outcome check (
  (outcome = 'sold' and no_sale_reason is null) or
  (outcome = 'no_sale' and no_sale_reason is not null)
);

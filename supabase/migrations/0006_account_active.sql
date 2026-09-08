-- Accounts are archived, never deleted — once a shop has real order/visit
-- history, removing the row would either violate the foreign keys pointing
-- at it or destroy that history. Managers can hide a closed/duplicate shop
-- from day-to-day use instead, same idea as profiles.active for staff.
alter table public.accounts add column active boolean not null default true;

-- 1) Replace the call outcome list with the telesales script's actual
-- branches. "No Answer" stays (nobody picked up isn't the same thing as
-- "not interested"); "Follow up" becomes "Interested / Call Back" so it can
-- carry a reason and a follow-up date; "Order Placed" is unchanged.
create type public.call_outcome_new as enum (
  'interested_callback',
  'not_interested',
  'order_placed',
  'no_answer'
);

alter table public.calls add column outcome_new call_outcome_new;

-- Disable the audit/updated_at triggers (from migration 0012) for this one
-- statement — this is a data migration, not an agent/manager editing a
-- row, and shouldn't mark every existing call "(edited)" or spam audit_log.
alter table public.calls disable trigger calls_set_updated_at;
alter table public.calls disable trigger calls_audit;

update public.calls set outcome_new = (case outcome
  when 'order_placed' then 'order_placed'
  when 'follow_up' then 'interested_callback'
  when 'no_answer' then 'no_answer'
end)::text::call_outcome_new;

alter table public.calls enable trigger calls_set_updated_at;
alter table public.calls enable trigger calls_audit;

alter table public.calls alter column outcome_new set not null;
alter table public.calls drop column outcome;
alter table public.calls rename column outcome_new to outcome;

drop type public.call_outcome;
alter type public.call_outcome_new rename to call_outcome;

-- 2) Call Type — what kind of call this is, independent of how it went.
-- Nullable at the DB level (existing calls predate this and have none),
-- but the New Call form requires picking one.
create type public.call_type as enum ('new_customer', 'reactivation', 'follow_up');
alter table public.calls add column call_type call_type;

-- 3) One reason enum covering both branches that need a reason — "why is
-- this shop interested" and "why isn't it" are different questions, but
-- they're mutually exclusive per row (only one branch applies at a time),
-- so a single nullable column keeps this as simple as the no_sale_reason
-- pattern on visits. A check constraint enforces which outcomes need one:
--  - not_interested: required
--  - interested_callback: optional (an agent may just know "call back")
--  - order_placed / no_answer: must be empty, there's nothing to explain
create type public.call_reason as enum (
  'wants_price',
  'wants_availability',
  'wants_specific_flower',
  'waiting_next_purchase',
  'needs_owner_approval',
  'price_too_high',
  'bought_competitor',
  'no_current_demand',
  'quality_concern',
  'doesnt_want_change_supplier',
  'other'
);
alter table public.calls add column call_reason call_reason;

alter table public.calls add constraint calls_reason_matches_outcome check (
  (outcome = 'not_interested' and call_reason is not null) or
  (outcome = 'interested_callback') or
  (outcome in ('order_placed', 'no_answer') and call_reason is null)
);

-- Free-text notes on an account (e.g. "closed Fridays", "prefers morning
-- delivery") — general context about the shop, separate from the
-- per-visit/per-call notes already on visits.note and calls.note.
alter table public.accounts add column notes text;

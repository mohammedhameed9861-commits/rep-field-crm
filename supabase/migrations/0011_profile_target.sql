-- Per-rep monthly cartons target, alongside the company-wide one in
-- app_settings. Nullable — a rep with no target set just shows no
-- Target Achievement % rather than a misleading 0%. Manager-only to set,
-- same as every other profiles write (no direct client UPDATE policy on
-- profiles at all — this goes through the manage-rep Edge Function, like
-- change_role and set_active already do).
alter table public.profiles add column monthly_target_cartons numeric(10,1);

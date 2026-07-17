-- ============================================================
-- Helper functions & triggers
-- ============================================================

-- Returns true iff the currently authenticated user is an active manager.
-- SECURITY DEFINER + owned by the migration role (postgres, which has
-- BYPASSRLS) so it can read profiles without recursing into profiles' own
-- RLS policies.
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager' and active = true
  );
$$;

-- Auto-create a profile row whenever a new auth.users row is created.
-- Role always defaults to 'rep' here — role is never taken from client-
-- supplied signup metadata, so a rep can never self-assign 'manager'.
-- The manager "add rep" flow (server-side, service-role) updates the role
-- afterwards.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'rep');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Block reps from escalating their own role or reactivating/deactivating
-- themselves. Only an active manager (or the service role, which bypasses
-- RLS/triggers-via-RLS-context is irrelevant here since this trigger always
-- runs, but is_manager() checks auth.uid() which is null for service-role
-- calls made without a user JWT — those go through Postgres directly and
-- are trusted) may change these two columns.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_manager() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'Only managers can change role or active status';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_profile_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

-- Automatically create the matching invoice when a visit is inserted with
-- outcome = 'sold'. This is the ONLY way an invoice row is ever created —
-- there is deliberately no INSERT policy for invoices, so a rep cannot
-- fabricate an invoice without a corresponding visit, and the amount can
-- never drift from what was recorded on the visit itself.
create or replace function public.create_invoice_for_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.outcome = 'sold' then
    insert into public.invoices (visit_id, rep_id, shop_id, amount)
    values (new.id, new.rep_id, new.shop_id, new.sale_amount);
  end if;
  return new;
end;
$$;

create trigger trg_create_invoice_for_sale
after insert on public.visits
for each row execute function public.create_invoice_for_sale();

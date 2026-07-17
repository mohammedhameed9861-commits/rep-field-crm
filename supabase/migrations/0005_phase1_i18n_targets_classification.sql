-- ============================================================
-- Phase 1: shop classification, daily targets, expanded no-sale
-- reasons. (Arabic/English is frontend-only, no schema change.)
-- ============================================================

-- Shop classification (A/B/C), set by whichever rep is visiting.
alter table public.shops add column classification text check (classification in ('A', 'B', 'C'));

-- Shops become append-mostly instead of fully immutable: reps may update
-- classification, but nothing else (name/number/coords/creator are still
-- locked down, exactly like before, via this trigger).
create or replace function public.prevent_shop_immutable_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.shop_name is distinct from old.shop_name
    or new.shop_number is distinct from old.shop_number
    or new.lat is distinct from old.lat
    or new.lng is distinct from old.lng
    or new.created_by is distinct from old.created_by
  then
    raise exception 'shop_name, shop_number, lat, lng and created_by cannot be changed';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_shop_immutable_field_change
before update on public.shops
for each row execute function public.prevent_shop_immutable_field_change();

create policy "shops_update_authenticated"
  on public.shops for update
  to authenticated
  using (true)
  with check (true);

-- Daily sales target, set only by a manager (extends the existing
-- privilege-escalation guard to cover this column too).
alter table public.profiles add column daily_target numeric check (daily_target is null or daily_target >= 0);

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_manager() then
    if new.role is distinct from old.role
      or new.active is distinct from old.active
      or new.daily_target is distinct from old.daily_target
    then
      raise exception 'Only managers can change role, active status or daily target';
    end if;
  end if;
  return new;
end;
$$;

-- Expanded no-sale reason list. Any existing 'closed' rows (not in the new
-- set) are remapped to 'other' first so the new constraint can attach.
update public.visits set no_sale_reason = 'other' where no_sale_reason = 'closed';

alter table public.visits drop constraint visits_no_sale_reason_check;

alter table public.visits add constraint visits_no_sale_reason_check check (
  no_sale_reason in (
    'price',
    'no_stock_need',
    'competitor',
    'no_cash',
    'not_requested',
    'delivery_problem',
    'owner_absent',
    'previous_complaint',
    'credit_issue',
    'other'
  )
);

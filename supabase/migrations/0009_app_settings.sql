-- A single row of app-wide settings a manager can edit from the Dashboard —
-- starting with the monthly cartons target. Singleton via a boolean PK that
-- can only ever be `true`, so there's exactly one row, ever.
create table public.app_settings (
  id                     boolean primary key default true,
  monthly_target_cartons numeric(10,1) not null default 1000,
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id, monthly_target_cartons) values (true, 1000);

alter table public.app_settings enable row level security;

create policy "staff can read settings" on public.app_settings
  for select to authenticated
  using (true);

create policy "managers update settings" on public.app_settings
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

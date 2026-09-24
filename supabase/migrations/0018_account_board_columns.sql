-- Manager-defined columns for organizing shops on the Accounts page's new
-- "Board" tab — e.g. "Follow up", "VIP". Purely organizational: a column
-- assignment never touches an account's real data (name, phone, class,
-- orders, visit/call history). One column per shop at a time, like a
-- Kanban board — dragging a shop into a new column removes it from the
-- old one. A shop with no column (board_column_id is null) isn't hidden or
-- lost; it just hasn't been filed into a column yet, and still shows in the
-- plain accounts list exactly as before this migration.

create table public.account_board_columns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int  not null default 0,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

alter table public.account_board_columns
  add constraint account_board_columns_name_not_blank check (length(btrim(name)) > 0);

alter table public.accounts add column board_column_id uuid
  references public.account_board_columns(id) on delete set null;

create index accounts_board_column_idx on public.accounts (board_column_id);

alter table public.account_board_columns enable row level security;

-- Every active staff member can see the columns (and, via the accounts
-- table they already read, which shop sits in which one).
create policy "staff can read board columns" on public.account_board_columns
  for select to authenticated
  using (public.my_role() is not null);

-- Creating, renaming, and deleting columns stays manager-only — the same
-- boundary as creating or editing an account itself.
create policy "managers create board columns" on public.account_board_columns
  for insert to authenticated
  with check (public.my_role() = 'manager');

create policy "managers update board columns" on public.account_board_columns
  for update to authenticated
  using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

create policy "managers delete board columns" on public.account_board_columns
  for delete to authenticated
  using (public.my_role() = 'manager');

-- Moving a shop between columns (or off the board entirely, p_column_id =
-- null) is the one thing every active staff member can do here, without
-- opening up the "managers update accounts" policy that guards every other
-- field on the account. Security definer, with the check done by hand —
-- exactly the same shape as my_role() itself needing to bypass RLS to read
-- one row of profiles.
create or replace function public.set_account_board_column(p_account_id uuid, p_column_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.my_role() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_column_id is not null and not exists (
    select 1 from public.account_board_columns where id = p_column_id
  ) then
    raise exception 'no such column' using errcode = '22023';
  end if;
  if not exists (select 1 from public.accounts where id = p_account_id) then
    raise exception 'no such account' using errcode = '22023';
  end if;
  update public.accounts set board_column_id = p_column_id where id = p_account_id;
end;
$$;

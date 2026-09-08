-- New sign-ups always land as 'rep' — the role is never taken from
-- client-supplied signup data, so nobody can self-promote to manager or
-- telesales by controlling what they send at signup. Promoting someone
-- happens later, by an existing manager, through a proper admin path (not
-- built yet — see README "Known gaps").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'rep');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

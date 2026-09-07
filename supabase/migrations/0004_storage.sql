-- Visit photos — private bucket, not public. These are internal proof-of-
-- visit photos, not customer-facing content, so only signed-in staff can
-- read or write them (unlike the marketing site's public gallery bucket).

insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do update set public = false;

create policy "staff can view visit photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'visit-photos');

create policy "reps upload their own visit photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'visit-photos' and public.my_role() = 'rep');

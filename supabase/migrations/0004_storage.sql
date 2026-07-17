-- ============================================================
-- Storage: visit-photos bucket
-- Path convention: {rep_id}/{visit_id}/inside.jpg | outside.jpg
-- ============================================================

insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do nothing;

-- A rep may upload only into their own {rep_id}/... folder.
create policy "visit_photos_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A rep may read their own photos; a manager may read all.
create policy "visit_photos_select_own_or_manager"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'visit-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_manager()
    )
  );

-- No update/delete policies: uploaded visit photos are permanent audit
-- evidence and cannot be replaced or removed by clients.

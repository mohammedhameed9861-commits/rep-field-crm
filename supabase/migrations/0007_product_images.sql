-- ============================================================
-- Product images: public bucket (product photos are catalog
-- assets, not sensitive audit evidence like visit-photos), manager
-- writes only.
-- ============================================================

alter table public.products add column image_url text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_insert_manager"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_manager());

create policy "product_images_update_manager"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_manager())
  with check (bucket_id = 'product-images' and public.is_manager());

create policy "product_images_delete_manager"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_manager());

-- 1) Remove the made-up starter reviews: reviews now come from real customers only.
--    (The seed reviews were the only ones with no author account.)
delete from public.reviews where user_id is null;

-- 2) Public bucket for product photos uploaded by the admin.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy product_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy product_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

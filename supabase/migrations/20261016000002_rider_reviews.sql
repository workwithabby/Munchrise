-- Customers rate the rider who delivered their order (one rating per order).
create table public.rider_reviews (
  id         uuid primary key default gen_random_uuid(),
  order_id   text not null unique references public.orders (id) on delete cascade,
  rider_id   uuid not null references public.profiles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  author     text not null,
  rating     integer not null check (rating between 1 and 5),
  comment    text not null default '',
  created_at timestamptz not null default now()
);

create index rider_reviews_rider_idx on public.rider_reviews (rider_id, created_at desc);

alter table public.rider_reviews enable row level security;

-- the customer who wrote it, the rider it is about, and admins can read it
create policy rider_reviews_read on public.rider_reviews for select to authenticated
  using (user_id = auth.uid() or rider_id = auth.uid() or public.is_admin());

-- only for your own DELIVERED order, and only for the rider who delivered it
create policy rider_reviews_insert on public.rider_reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = rider_reviews.order_id
        and o.user_id = auth.uid()
        and o.status = 'Delivered'
        and o.rider_id = rider_reviews.rider_id
    )
  );

create policy rider_reviews_admin_delete on public.rider_reviews for delete to authenticated
  using (public.is_admin());

grant select, insert on public.rider_reviews to authenticated;

alter publication supabase_realtime add table public.rider_reviews;

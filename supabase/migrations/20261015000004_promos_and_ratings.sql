-- =====================================================================
-- Promo codes: sanity rules + live updates. Star ratings: computed from reviews.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Promo codes (admins create them in the app; customers use them at checkout)
-- ---------------------------------------------------------------------
alter table public.promo_codes
  add constraint promo_code_format check (code ~ '^[A-Z0-9]{3,20}$'),
  add constraint promo_value_ok check (
    (type = 'percent' and value between 1 and 100) or (type = 'fixed' and value > 0)
  ),
  add constraint promo_min_ok check (min_subtotal is null or min_subtotal >= 0);

-- a promo change reaches every open app straight away
alter publication supabase_realtime add table public.promo_codes;

-- ---------------------------------------------------------------------
-- Star ratings = average of the real reviews.
-- A product with no reviews yet keeps its starting rating (base_rating).
-- ---------------------------------------------------------------------
alter table public.products add column base_rating numeric(2, 1) not null default 0;
update public.products set base_rating = rating;

create function public.recompute_product_rating(p_product integer) returns void
  language sql security definer set search_path = public as
$$
  update public.products p
     set rating = coalesce(
       (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.product_id = p_product),
       p.base_rating
     )
   where p.id = p_product;
$$;

create function public.reviews_rating_trigger() returns trigger
  language plpgsql security definer set search_path = public as
$$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_product_rating(old.product_id);
  else
    perform public.recompute_product_rating(new.product_id);
    if (tg_op = 'UPDATE' and old.product_id <> new.product_id) then
      perform public.recompute_product_rating(old.product_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger reviews_update_rating
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_rating_trigger();

-- bring every product in line with the reviews that already exist
select public.recompute_product_rating(id) from public.products;

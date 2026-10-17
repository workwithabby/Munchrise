-- =====================================================================
-- 1) Customers can edit and delete their OWN reviews
-- 2) Admins can give a role (user / rider / admin) to any account from the app
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reviews: owner edit + delete
-- Only the stars and the comment can be changed; the product, the owner
-- and the date stay fixed (column-level permission).
-- The rating trigger from the previous migration already recomputes the
-- product's stars after every update or delete.
-- ---------------------------------------------------------------------
revoke update on public.reviews from authenticated, anon;
grant update (rating, comment) on public.reviews to authenticated;

create policy reviews_owner_update on public.reviews for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reviews_owner_delete on public.reviews for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Staff roles: admin-only, no more hand-written SQL.
-- An admin cannot change their own role (so the last admin can never
-- lock everyone out), and the role must be a known one.
-- ---------------------------------------------------------------------
create function public.set_user_role(p_user uuid, p_role text)
  returns public.profiles
  language plpgsql security definer set search_path = public as
$$
declare
  v_row public.profiles;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not public.is_admin() then raise exception 'Only admins can change roles.'; end if;
  if p_role not in ('user', 'admin', 'rider') then raise exception 'Unknown role.'; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own role.'; end if;

  update public.profiles set role = p_role where id = p_user returning * into v_row;
  if not found then raise exception 'Account not found.'; end if;

  -- a new rider gets their settings row so the Deliveries screen works at once
  if p_role = 'rider' then
    insert into public.rider_settings (user_id) values (p_user) on conflict do nothing;
  end if;

  insert into public.notifications (user_id, title, message, type)
  values (p_user, 'Your role changed',
          'You are now ' || case p_role when 'user' then 'a customer' else 'a ' || p_role end
          || '. Log out and back in to see your new screens.', 'order');

  return v_row;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- Let a customer add their own in-app notices (e.g. "Items added to cart").
-- Order notices still come from the server functions.
create policy notifications_insert on public.notifications for insert to authenticated
  with check (user_id = auth.uid());

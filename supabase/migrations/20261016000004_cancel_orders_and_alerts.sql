-- Cancelled orders and in-app alerts for the admin / riders.

-- ---------------------------------------------------------------------
-- 1) Cancelled status
-- ---------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'));

alter table public.orders
  add column if not exists cancel_reason text,
  add column if not exists cancelled_by  text;

-- set_order_status: same rules as before, plus a cancelled order can never be moved again.
-- (Cancelling goes through cancel_order below.)
create or replace function public.set_order_status(p_order text, p_status text)
  returns public.orders
  language plpgsql security definer set search_path = public as
$$
declare
  v_uid   uuid := auth.uid();
  v_role  text := public.my_role();
  v_order public.orders;
  v_name  text;
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;
  if p_status not in ('Placed', 'Preparing', 'Out for Delivery', 'Delivered') then
    raise exception 'Unknown status.';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_order.status = 'Cancelled' then raise exception 'This order was cancelled.'; end if;
  if v_order.status = p_status then return v_order; end if;

  select name into v_name from public.profiles where id = v_uid;

  if v_role = 'admin' then
    update public.orders set status = p_status where id = p_order returning * into v_order;
  elsif v_role = 'rider' then
    if p_status = 'Out for Delivery' and v_order.status = 'Preparing' then
      if not coalesce((select online from public.rider_settings where user_id = v_uid), true) then
        raise exception 'You are offline. Go online to take orders.';
      end if;
      update public.orders set status = p_status, rider_id = v_uid, rider_name = v_name
       where id = p_order returning * into v_order;
    elsif p_status = 'Delivered' and v_order.status = 'Out for Delivery' and v_order.rider_id = v_uid then
      update public.orders set status = p_status where id = p_order returning * into v_order;
    else
      raise exception 'You cannot make that change to this order.';
    end if;
  else
    raise exception 'Not allowed.';
  end if;

  insert into public.order_status_history (order_id, status) values (p_order, p_status);

  insert into public.notifications (user_id, title, message, type)
  values (
    v_order.user_id,
    'Order ' || p_status,
    case
      when v_order.rider_name is not null and p_status = 'Out for Delivery'
        then 'Your order ' || v_order.id || ' is out for delivery with ' || v_order.rider_name || '.'
      else 'Your order ' || v_order.id || ' is now ' || lower(p_status) || '.'
    end,
    'order'
  );

  return v_order;
end;
$$;

-- Cancel an order.
--   customer: only their own order, only while it is still "Placed"
--   admin:    "Placed" or "Preparing", with a reason
-- Stock goes back on the shelf and the points of that order are taken back.
create or replace function public.cancel_order(p_order text, p_reason text default null)
  returns public.orders
  language plpgsql security definer set search_path = public as
$$
declare
  v_uid    uuid := auth.uid();
  v_role   text := public.my_role();
  v_order  public.orders;
  v_reason text := left(btrim(coalesce(p_reason, '')), 200);
  v_note   text := '';
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_order.status = 'Cancelled' then return v_order; end if;

  if v_role = 'user' then
    if v_order.user_id <> v_uid then raise exception 'Order not found.'; end if;
    if v_order.status <> 'Placed' then
      raise exception 'The kitchen already started your order, so it can no longer be cancelled.';
    end if;
  elsif v_role = 'admin' then
    if v_order.status not in ('Placed', 'Preparing') then
      raise exception 'Only orders that have not left the kitchen can be cancelled.';
    end if;
    if v_reason = '' then raise exception 'Please give a reason.'; end if;
  else
    raise exception 'Not allowed.';
  end if;

  update public.orders
     set status = 'Cancelled', cancel_reason = nullif(v_reason, ''), cancelled_by = v_role
   where id = p_order returning * into v_order;

  insert into public.order_status_history (order_id, status) values (p_order, 'Cancelled');

  -- put the items back in stock
  update public.products p
     set stock = p.stock + i.quantity
    from public.order_items i
   where i.order_id = p_order and i.product_id = p.id;

  -- take back the points this order gave
  if v_order.points_earned > 0 then
    insert into public.reward_ledger (user_id, points, kind, label)
    values (v_order.user_id, -v_order.points_earned, 'redeem', 'Cancelled order ' || p_order);
  end if;

  if v_order.payment <> 'Cash on Delivery' then
    v_note := ' Your payment will be refunded.';
  end if;

  insert into public.notifications (user_id, title, message, type)
  values (
    v_order.user_id,
    'Order cancelled',
    case
      when v_role = 'admin'
        then 'Your order ' || p_order || ' was cancelled by the store' ||
             case when v_reason <> '' then ': ' || v_reason || '.' else '.' end || v_note
      else 'You cancelled order ' || p_order || '.' || v_note
    end,
    'order'
  );

  return v_order;
end;
$$;

revoke all on function public.cancel_order(text, text) from public, anon;
grant execute on function public.cancel_order(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2) Alerts for the admin and riders (they appear as in-app notifications)
-- ---------------------------------------------------------------------
create or replace function public.notify_staff_on_order()
  returns trigger
  language plpgsql security definer set search_path = public as
$$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, title, message, type)
    select p.id, 'New order',
           'Order ' || new.id || ' · ' || coalesce(new.shipping ->> 'fullName', 'Customer') ||
           ' · P' || new.total,
           'order'
      from public.profiles p where p.role = 'admin';

  elsif new.status is distinct from old.status then
    if new.status = 'Preparing' then
      -- ready for a rider: tell every rider who is online
      insert into public.notifications (user_id, title, message, type)
      select p.id, 'Order ready for pickup',
             'Order ' || new.id || ' is ready · deliver to ' || coalesce(new.shipping ->> 'city', 'the customer'),
             'order'
        from public.profiles p
        left join public.rider_settings s on s.user_id = p.id
       where p.role = 'rider' and coalesce(s.online, true);

    elsif new.status = 'Cancelled' and new.cancelled_by = 'user' then
      insert into public.notifications (user_id, title, message, type)
      select p.id, 'Order cancelled',
             'The customer cancelled order ' || new.id ||
             case when new.cancel_reason is not null then ': ' || new.cancel_reason else '' end,
             'order'
        from public.profiles p where p.role = 'admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_notify_staff on public.orders;
create trigger orders_notify_staff
  after insert or update of status on public.orders
  for each row execute function public.notify_staff_on_order();

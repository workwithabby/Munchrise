-- Customers can no longer cancel. Only staff can:
--   admin: "Placed" or "Preparing"
--   rider: an order they took ("Out for Delivery"), e.g. customer unreachable
-- A reason is always required and is shown to the customer.

create or replace function public.cancel_order(p_order text, p_reason text default null)
  returns public.orders
  language plpgsql security definer set search_path = public as
$$
declare
  v_uid    uuid := auth.uid();
  v_role   text := public.my_role();
  v_order  public.orders;
  v_prev   text;
  v_reason text := left(btrim(coalesce(p_reason, '')), 200);
  v_note   text := '';
  v_who    text;
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found.'; end if;
  if v_order.status = 'Cancelled' then return v_order; end if;
  v_prev := v_order.status;

  if v_role = 'admin' then
    if v_prev not in ('Placed', 'Preparing') then
      raise exception 'Only orders that have not left the kitchen can be cancelled.';
    end if;
  elsif v_role = 'rider' then
    if v_prev <> 'Out for Delivery' or v_order.rider_id is distinct from v_uid then
      raise exception 'You can only cancel an order you are delivering.';
    end if;
  else
    raise exception 'Orders can only be cancelled by the store or the rider.';
  end if;
  if v_reason = '' then raise exception 'Please give a reason.'; end if;

  update public.orders
     set status = 'Cancelled', cancel_reason = v_reason, cancelled_by = v_role
   where id = p_order returning * into v_order;

  insert into public.order_status_history (order_id, status) values (p_order, 'Cancelled');

  -- items still in the kitchen go back on the shelf; food already on the road does not
  if v_prev in ('Placed', 'Preparing') then
    update public.products p
       set stock = p.stock + i.quantity
      from public.order_items i
     where i.order_id = p_order and i.product_id = p.id;
  end if;

  -- take back the points this order gave
  if v_order.points_earned > 0 then
    insert into public.reward_ledger (user_id, points, kind, label)
    values (v_order.user_id, -v_order.points_earned, 'redeem', 'Cancelled order ' || p_order);
  end if;

  if v_order.payment <> 'Cash on Delivery' then
    v_note := ' Your payment will be refunded.';
  end if;

  v_who := case when v_role = 'rider' then 'your rider' else 'the store' end;

  insert into public.notifications (user_id, title, message, type)
  values (
    v_order.user_id,
    'Order cancelled',
    'Your order ' || p_order || ' was cancelled by ' || v_who || ': ' || v_reason || '.' || v_note,
    'order'
  );

  return v_order;
end;
$$;

revoke all on function public.cancel_order(text, text) from public, anon;
grant execute on function public.cancel_order(text, text) to authenticated;

-- Tell the admin when a rider cancels (customers can no longer cancel).
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
      insert into public.notifications (user_id, title, message, type)
      select p.id, 'Order ready for pickup',
             'Order ' || new.id || ' is ready · deliver to ' || coalesce(new.shipping ->> 'city', 'the customer'),
             'order'
        from public.profiles p
        left join public.rider_settings s on s.user_id = p.id
       where p.role = 'rider' and coalesce(s.online, true);

    elsif new.status = 'Cancelled' and new.cancelled_by = 'rider' then
      insert into public.notifications (user_id, title, message, type)
      select p.id, 'Order cancelled by rider',
             'Order ' || new.id || ' was cancelled by the rider' ||
             case when new.cancel_reason is not null then ': ' || new.cancel_reason else '' end,
             'order'
        from public.profiles p where p.role = 'admin';
    end if;
  end if;
  return new;
end;
$$;

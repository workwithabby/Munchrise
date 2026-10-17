-- Simulated payment receipt kept with the order (no real money is involved).
alter table public.orders
  add column if not exists payment_ref text,
  add column if not exists paid_at timestamptz;

-- The customer who placed the order saves the receipt of a GCash / card payment once.
create or replace function public.record_payment(p_order text, p_ref text, p_paid_at timestamptz default now())
  returns void
  language plpgsql security definer set search_path = public as
$$
begin
  update public.orders
     set payment_ref = left(btrim(p_ref), 40),
         paid_at     = coalesce(p_paid_at, now())
   where id = p_order
     and user_id = auth.uid()
     and payment <> 'Cash on Delivery'
     and payment_ref is null
     and length(btrim(coalesce(p_ref, ''))) > 0;
end;
$$;

revoke all on function public.record_payment(text, text, timestamptz) from public, anon;
grant execute on function public.record_payment(text, text, timestamptz) to authenticated;

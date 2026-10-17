import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';

import { DELIVERY_FEE, FREE_DELIVERY_MIN } from '../data/promos';
import { Order, OrderStatus, PaymentMethod, ShippingInfo } from '../models/order.model';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { NotificationService } from './notification.service';
import { PromoService } from './promo.service';
import { load, makeId, save } from './storage';
import { RewardsService } from './rewards.service';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'munchrise.orders';

export interface PromoResult {
  ok: boolean;
  discount: number;
  message: string;
}

export interface OrderQuote {
  subtotal: number;
  promoDiscount: number;
  rewardDiscount: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface CheckoutInput {
  shipping: ShippingInfo;
  payment: PaymentMethod;
  promoCode?: string;
  /** Discount bought with reward points. */
  rewardDiscount?: number;
  /** Receipt of the simulated payment (GCash / card). */
  paymentRef?: string;
  paidAt?: string;
}

export interface CheckoutResult {
  ok: boolean;
  message: string;
  order?: Order;
}

export interface StatusResult {
  ok: boolean;
  message?: string;
}

/** A database row (with its items and status history) -> the app's Order. */
function fromRow(row: Record<string, unknown>): Order {
  const items = (row['order_items'] as Record<string, unknown>[] | undefined) ?? [];
  const history = (row['order_status_history'] as Record<string, unknown>[] | undefined) ?? [];

  return {
    id: row['id'] as string,
    placedAt: row['placed_at'] as string,
    items: items.map((i) => ({
      productId: (i['product_id'] as number) ?? 0,
      name: i['name'] as string,
      price: Number(i['price']),
      quantity: i['quantity'] as number,
    })),
    subtotal: Number(row['subtotal']),
    deliveryFee: Number(row['delivery_fee']),
    discount: Number(row['discount']),
    total: Number(row['total']),
    promoCode: (row['promo_code'] as string | null) ?? undefined,
    payment: row['payment'] as PaymentMethod,
    shipping: row['shipping'] as ShippingInfo,
    status: row['status'] as OrderStatus,
    history: history
      .map((h) => ({ status: h['status'] as OrderStatus, at: h['at'] as string }))
      .sort((a, b) => a.at.localeCompare(b.at)),
    riderName: (row['rider_name'] as string | null) ?? undefined,
    riderId: (row['rider_id'] as string | null) ?? undefined,
    pointsEarned: (row['points_earned'] as number) ?? 0,
    cancelReason: (row['cancel_reason'] as string | null) ?? undefined,
    cancelledBy: (row['cancelled_by'] as 'user' | 'admin' | null) ?? undefined,
    paymentRef: (row['payment_ref'] as string | null) ?? undefined,
    paidAt: (row['paid_at'] as string | null) ?? undefined,
  };
}

/**
 * Order history, checkout maths and the order status flow.
 *
 * Backend mode: orders live in Supabase. Checkout is the `place_order` server function
 * (real prices, stock check, promo, points), status changes are `set_order_status`
 * (admin and rider rules enforced by the database), and every change reaches the
 * customer, admin and rider live. Local mode (unit tests): localStorage.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly cart = inject(CartService);
  private readonly rewards = inject(RewardsService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly promos = inject(PromoService);
  private readonly backend = inject(SupabaseService);

  private readonly ordersState = signal<Order[]>(
    this.backend.enabled ? [] : load<Order[]>(STORAGE_KEY, []),
  );
  private channel: RealtimeChannel | undefined;

  constructor() {
    if (!this.backend.enabled) {
      // Admin and customer may be in two tabs/windows: pick up status changes made in the other one.
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
          if (e.key === STORAGE_KEY) this.ordersState.set(load<Order[]>(STORAGE_KEY, []));
        });
      }
      return;
    }

    // Load (and listen for) the orders this person may see: a customer's own, a rider's
    // pickups, or all of them for the admin. The database decides which.
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        this.stopListening();
        if (user && user.role !== 'guest') {
          void this.refresh();
          this.listen();
        } else {
          this.ordersState.set([]);
        }
      });
    });
  }

  readonly orders = this.ordersState.asReadonly();
  readonly orderCount = computed(() => this.ordersState().length);

  /** Orders that have not been delivered yet, newest first. */
  readonly activeOrders = computed(() => this.ordersState().filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled'));

  get(id: string): Order | undefined {
    return this.ordersState().find((o) => o.id === id);
  }

  /** Newest first. */
  list(): Order[] {
    return [...this.ordersState()].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  /** Re-reads the orders from the server. */
  async refresh(): Promise<void> {
    if (!this.backend.enabled) return;
    const { data, error } = await this.backend.client
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .order('placed_at', { ascending: false });
    if (error || !data) return;
    this.ordersState.set(data.map(fromRow));
  }

  /** Validate a promo code against the current subtotal. */
  applyPromo(code: string, subtotal: number): PromoResult {
    const clean = code.trim().toUpperCase();
    const promo = this.promos.find(clean);

    if (!clean) return { ok: false, discount: 0, message: 'Enter a promo code.' };
    if (!promo) return { ok: false, discount: 0, message: `Invalid code "${clean}".` };

    if (promo.minSubtotal !== undefined && subtotal < promo.minSubtotal) {
      return {
        ok: false,
        discount: 0,
        message: `${promo.code} needs a minimum subtotal of ₱${promo.minSubtotal}.`,
      };
    }

    const discount =
      promo.type === 'percent'
        ? Math.round((subtotal * promo.value) / 100)
        : Math.min(promo.value, subtotal);

    return { ok: true, discount, message: `${promo.code} applied! ${promo.description}.` };
  }

  /** Prices for the checkout / confirmation screens (the server repeats this maths when you order). */
  quote(promoCode?: string, rewardDiscount = 0): OrderQuote {
    const subtotal = this.cart.subtotal();
    const promo = promoCode ? this.applyPromo(promoCode, subtotal) : undefined;
    const promoDiscount = promo?.ok ? promo.discount : 0;
    const safeRewardDiscount = Math.max(0, Math.min(rewardDiscount, subtotal - promoDiscount));
    const discount = promoDiscount + safeRewardDiscount;
    const deliveryFee =
      subtotal === 0 || subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const total = Math.max(0, subtotal - discount + deliveryFee);

    return { subtotal, promoDiscount, rewardDiscount: safeRewardDiscount, discount, deliveryFee, total };
  }

  async placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
    const lines = this.cart.detailedItems();
    if (lines.length === 0) {
      return { ok: false, message: 'Your cart is empty.' };
    }

    if (this.backend.enabled) return this.placeOrderOnServer(input);

    const quote = this.quote(input.promoCode, input.rewardDiscount ?? 0);

    const order: Order = {
      id: makeOrderNumber(),
      placedAt: new Date().toISOString(),
      items: lines.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        price: line.product.price,
        quantity: line.quantity,
      })),
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFee,
      discount: quote.discount,
      total: quote.total,
      promoCode: quote.promoDiscount > 0 ? input.promoCode?.toUpperCase() : undefined,
      payment: input.payment,
      shipping: input.shipping,
      status: 'Placed',
      history: [{ status: 'Placed', at: new Date().toISOString() }],
      pointsEarned: this.rewards.pointsFor(quote.total),
      paymentRef: input.paymentRef,
      paidAt: input.paidAt,
    };

    const next = [order, ...this.ordersState()];
    this.ordersState.set(next);
    save(STORAGE_KEY, next);

    // The voucher you checked at checkout is now used up.
    if (quote.rewardDiscount > 0) {
      this.rewards.spendVoucher(quote.rewardDiscount);
    }

    // Reward the customer and let them know — this is what the demo needs.
    this.rewards.addEarn(order.pointsEarned, `Order ${order.id}`);
    this.notifications.add(
      'Order placed',
      `Your order ${order.id} is now Placed. +${order.pointsEarned} points!`,
      'order',
    );

    this.cart.clear();

    return { ok: true, message: `Order ${order.id} placed!`, order };
  }

  /** Backend checkout: one server call prices the cart, checks stock, saves the order and awards points. */
  private async placeOrderOnServer(input: CheckoutInput): Promise<CheckoutResult> {
    // make sure the server has the latest cart before it reads it
    await this.cart.flush();

    const { data, error } = await this.backend.client.rpc('place_order', {
      p_shipping: input.shipping,
      p_payment: input.payment,
      p_promo: input.promoCode ?? null,
      p_use_voucher: (input.rewardDiscount ?? 0) > 0,
    });
    if (error || !data) {
      return { ok: false, message: error?.message ?? 'Could not place your order. Please try again.' };
    }

    const id = (data as { id: string }).id;
    if (input.paymentRef) {
      // keep the payment receipt with the order (a failure here must not undo the order)
      await this.backend.client.rpc('record_payment', {
        p_order: id,
        p_ref: input.paymentRef,
        p_paid_at: input.paidAt ?? new Date().toISOString(),
      });
    }
    // the server emptied the cart, spent vouchers, added points and a notification
    await Promise.all([this.cart.reload(), this.refresh(), this.rewards.refresh()]);
    return { ok: true, message: `Order ${id} placed!`, order: this.get(id) };
  }

  /** Advance an order along Placed -> Preparing -> Out for Delivery -> Delivered. */
  advanceStatus(id: string): Promise<StatusResult> {
    const order = this.get(id);
    if (!order) return Promise.resolve({ ok: false, message: 'Order not found.' });

    const flow: OrderStatus[] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const index = flow.indexOf(order.status);
    if (index === -1 || index === flow.length - 1) return Promise.resolve({ ok: true });

    return this.setStatus(id, flow[index + 1]);
  }

  /**
   * Change an order's status. The screen updates at once; the server then checks who is
   * asking (admin: any change; rider: take a prepared order, deliver their own) and tells the
   * customer. If the server refuses, the screen goes back and the reason is returned.
   */
  async setStatus(id: string, status: OrderStatus, riderName?: string): Promise<StatusResult> {
    // nothing changes (and nobody is notified) when the status is already this one
    if (this.get(id)?.status === status) return { ok: true };
    if (this.get(id)?.status === 'Cancelled') return { ok: false, message: 'This order was cancelled.' };

    const previous = this.ordersState();
    const next = previous.map((order) =>
      order.id === id && order.status !== status
        ? {
            ...order,
            status,
            riderName: riderName ?? order.riderName,
            riderId: riderName ? this.auth.user()?.id ?? order.riderId : order.riderId,
            history: [...(order.history ?? []), { status, at: new Date().toISOString() }],
          }
        : order,
    );
    this.ordersState.set(next);

    if (this.backend.enabled) {
      const { error } = await this.backend.client.rpc('set_order_status', { p_order: id, p_status: status });
      if (error) {
        this.ordersState.set(previous);
        void this.refresh();
        return { ok: false, message: error.message };
      }
      void this.refresh(); // pick up the saved history and rider name
      return { ok: true };
    }

    save(STORAGE_KEY, next);
    const order = next.find((o) => o.id === id);
    if (order) {
      this.notifications.add(
        `Order ${status}`,
        order.riderName && status === 'Out for Delivery'
          ? `Your order ${order.id} is out for delivery with ${order.riderName}.`
          : `Your order ${order.id} is now ${status.toLowerCase()}.`,
        'order',
      );
    }
    return { ok: true };
  }

  /**
   * Cancel an order. A customer can do it while it is still "Placed"; the admin until it leaves
   * the kitchen. The server puts the stock back, takes the points back and tells the customer.
   */
  async cancelOrder(id: string, reason: string): Promise<StatusResult> {
    const order = this.get(id);
    if (!order) return { ok: false, message: 'Order not found.' };

    const asAdmin = this.auth.isAdmin();
    if (order.status === 'Cancelled') return { ok: true };
    if (asAdmin ? !['Placed', 'Preparing'].includes(order.status) : order.status !== 'Placed') {
      return {
        ok: false,
        message: asAdmin
          ? 'Only orders that have not left the kitchen can be cancelled.'
          : 'The kitchen already started your order, so it can no longer be cancelled.',
      };
    }

    if (this.backend.enabled) {
      const { error } = await this.backend.client.rpc('cancel_order', { p_order: id, p_reason: reason });
      if (error) return { ok: false, message: error.message };
      await Promise.all([this.refresh(), this.rewards.refresh()]);
      return { ok: true };
    }

    const next = this.ordersState().map((o) =>
      o.id === id
        ? {
            ...o,
            status: 'Cancelled' as const,
            cancelReason: reason,
            cancelledBy: asAdmin ? ('admin' as const) : ('user' as const),
            history: [...(o.history ?? []), { status: 'Cancelled' as const, at: new Date().toISOString() }],
          }
        : o,
    );
    this.ordersState.set(next);
    save(STORAGE_KEY, next);
    this.notifications.add('Order cancelled', `Order ${id} was cancelled.`, 'order');
    return { ok: true };
  }

  /** Put a past order back into the cart. */
  reorder(id: string): { ok: boolean; message: string } {
    const order = this.get(id);
    if (!order) return { ok: false, message: 'Order not found.' };

    this.cart.addMany(order.items);
    this.notifications.add('Items added to cart', `From order ${order.id}.`, 'order');
    return { ok: true, message: `${order.items.length} item(s) added to your cart.` };
  }

  /** Live changes: a status change anywhere refreshes this phone's orders within a moment. */
  private listen(): void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    this.channel = this.backend.client
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void this.refresh(), 400);
      })
      .subscribe();
  }

  private stopListening(): void {
    if (this.channel) {
      void this.backend.client.removeChannel(this.channel);
      this.channel = undefined;
    }
  }
}

/** Short receipt number, e.g. "MR-4F9K2Z". */
function makeOrderNumber(): string {
  const suffix = makeId('')
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toUpperCase();
  return `MR-${suffix}`;
}

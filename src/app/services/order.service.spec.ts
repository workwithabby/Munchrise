import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartService } from './cart.service';
import { NotificationService } from './notification.service';
import { OrderService } from './order.service';
import { ProductService } from './product.service';
import { RewardsService } from './rewards.service';

describe('OrderService', () => {
  let orders: OrderService;
  let cart: CartService;
  let products: ProductService;
  let rewards: RewardsService;
  let notifications: NotificationService;

  const shipping = {
    fullName: 'Abigail Dela Cruz',
    phone: '09171234567',
    address: 'Blk 7 Lot 12 Sampaguita St.',
    city: 'Quezon City',
  };

  beforeEach(async () => {
    localStorage.removeItem('munchrise.cart');
    localStorage.removeItem('munchrise.orders');
    localStorage.removeItem('munchrise.points');
    localStorage.removeItem('munchrise.points-history');
    localStorage.removeItem('munchrise.notifications');
    localStorage.removeItem('munchrise.user');

    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    orders = TestBed.inject(OrderService);
    cart = TestBed.inject(CartService);
    products = TestBed.inject(ProductService);
    rewards = TestBed.inject(RewardsService);
    notifications = TestBed.inject(NotificationService);
  });

  it('applies the RISE10 promo code (10% off)', async () => {
    cart.add(products.getById(29)!); // ₱249
    const result = orders.applyPromo('rise10', 249);

    expect(result.ok).toBe(true);
    expect(result.discount).toBe(25); // 10% of 249, rounded
  });

  it('requires the minimum subtotal for MUNCH50', async () => {
    const result = orders.applyPromo('MUNCH50', 200);
    expect(result.ok).toBe(false);
  });

  it('gives free delivery at ₱500 or more', async () => {
    cart.add(products.getById(29)!, 3); // ₱747
    expect(orders.quote().deliveryFee).toBe(0);
  });

  it('places an order, clears the cart, awards points and notifies', async () => {
    cart.add(products.getById(3)!); // ₱109
    cart.add(products.getById(10)!, 2); // ₱178

    const result = (await orders.placeOrder({ shipping, payment: 'GCash' }));

    expect(result.ok).toBe(true);
    expect(result.order?.status).toBe('Placed');
    expect(cart.count()).toBe(0);
    expect(orders.list().length).toBe(1);
    expect(result.order?.total).toBe(336); // 287 + 49 delivery
    // ₱287 food + ₱49 delivery = ₱336 total → 33 points (₱10 = 1 point)
    expect(rewards.points()).toBe(33);
    expect(notifications.unreadCount()).toBe(1);
    expect(result.order?.id.startsWith('MR-')).toBe(true);
  });

  it('records every status change with its time and lists active orders', async () => {
    cart.add(products.getById(3)!);
    const order = (await orders.placeOrder({ shipping, payment: 'Cash on Delivery' })).order!;

    expect(order.history?.map((h) => h.status)).toEqual(['Placed']);
    expect(orders.activeOrders().map((o) => o.id)).toEqual([order.id]);

    orders.advanceStatus(order.id);
    orders.setStatus(order.id, 'Delivered');

    const updated = orders.get(order.id)!;
    expect(updated.history?.map((h) => h.status)).toEqual(['Placed', 'Preparing', 'Delivered']);
    expect(orders.activeOrders()).toEqual([]);
  });

  it('does not log or notify again when the status is unchanged', async () => {
    cart.add(products.getById(3)!);
    const order = (await orders.placeOrder({ shipping, payment: 'Cash on Delivery' })).order!;

    const before = notifications.items().length;
    orders.setStatus(order.id, 'Placed');

    expect(orders.get(order.id)?.history?.length).toBe(1);
    expect(notifications.items().length).toBe(before);
  });
});

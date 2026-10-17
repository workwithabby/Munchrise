import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RiderPage } from './rider.page';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { RiderService } from '../../services/rider.service';
import { ProductService } from '../../services/product.service';

describe('RiderPage', () => {
  let orders: OrderService;
  let orderId: string;

  beforeEach(async () => {
    ['cart', 'orders', 'notifications', 'user', 'rider'].forEach((k) => localStorage.removeItem('munchrise.' + k));
    await TestBed.configureTestingModule({
      imports: [RiderPage],
      providers: [provideRouter([])],
    }).compileComponents();

    TestBed.inject(AuthService).login('rider@munchrise.com', 'Rider123!');
    TestBed.inject(CartService).add(TestBed.inject(ProductService).getById(3)!);
    orders = TestBed.inject(OrderService);
    orderId = (await orders.placeOrder({
      shipping: { fullName: 'Abigail Dela Cruz', phone: '09171234567', address: 'Blk 7 Lot 12', city: 'Quezon City' },
      payment: 'Cash on Delivery',
    })).order!.id;
  });

  it('takes an order from Preparing to Out for Delivery and counts earnings once delivered', async () => {
    const fixture = TestBed.createComponent(RiderPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const rider = TestBed.inject(RiderService);

    expect(page.orders().length).toBe(0); // still "Placed": the kitchen has not started

    orders.setStatus(orderId, 'Preparing');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Abigail Dela Cruz');

    await page.pickUp(orders.get(orderId)!);
    expect(orders.get(orderId)?.status).toBe('Out for Delivery');
    expect(orders.get(orderId)?.riderName).toBe('Juan Rider');
    expect(rider.onTheWay().length).toBe(1);

    orders.setStatus(orderId, 'Delivered');
    expect(rider.today().deliveries).toBe(1);
    expect(rider.today().earnings).toBe(orders.get(orderId)!.deliveryFee);
    expect(rider.cashOnHand()).toBe(orders.get(orderId)!.total); // Cash on Delivery
  });

  it('does not let an offline rider take an order', async () => {
    const rider = TestBed.inject(RiderService);
    const page = TestBed.createComponent(RiderPage).componentInstance;
    orders.setStatus(orderId, 'Preparing');

    rider.setOnline(false);
    await page.pickUp(orders.get(orderId)!);

    expect(orders.get(orderId)?.status).toBe('Preparing');
  });
});

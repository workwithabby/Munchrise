import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { OrderTrackingPage } from './order-tracking.page';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

describe('OrderTrackingPage', () => {
  let orders: OrderService;
  let orderId: string;

  beforeEach(async () => {
    ['cart', 'orders', 'notifications'].forEach((k) => localStorage.removeItem('munchrise.' + k));
    await TestBed.configureTestingModule({
      imports: [OrderTrackingPage],
      providers: [provideRouter([])],
    }).compileComponents();

    TestBed.inject(CartService).add(TestBed.inject(ProductService).getById(3)!);
    orders = TestBed.inject(OrderService);
    orderId = (await orders.placeOrder({
      shipping: { fullName: 'Abigail Dela Cruz', phone: '09171234567', address: 'Blk 7 Lot 12', city: 'Quezon City' },
      payment: 'Cash on Delivery',
    })).order!.id;
  });

  function open() {
    const fixture = TestBed.createComponent(OrderTrackingPage);
    fixture.componentRef.setInput('id', orderId);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the order as just placed, with an ETA and the first step current', async () => {
    const fixture = open();
    const page = fixture.componentInstance;

    expect(page.status()).toBe('Placed');
    expect(page.eta()).toContain('min');
    expect(page.riderPosition()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.tl-step').length).toBe(4);
    expect(fixture.nativeElement.querySelector('.tl-step.is-current .tl-step__title')?.textContent).toContain('Order placed');
  });

  it('moves the rider and the timeline as the status changes, and records the time', async () => {
    const fixture = open();
    const page = fixture.componentInstance;

    orders.setStatus(orderId, 'Out for Delivery');
    fixture.detectChanges();

    expect(page.stepIndex()).toBe(2);
    expect(page.riderPosition()).toBeGreaterThan(0.5);
    expect(page.timeFor('Out for Delivery')).toBeTruthy();
    expect(page.timeFor('Delivered')).toBeUndefined();

    orders.setStatus(orderId, 'Delivered');
    fixture.detectChanges();
    expect(page.delivered()).toBe(true);
    expect(page.riderPosition()).toBe(1);
    expect(fixture.nativeElement.querySelector('.scene')?.classList).toContain('is-delivered');
  });

  it('follows status changes made by the admin / rider (no auto-play)', async () => {
    const fixture = open();
    const page = fixture.componentInstance;
    const before = page.status();

    orders.setStatus(orderId, 'Out for Delivery', 'Juan Rider');

    expect(page.status()).toBe('Out for Delivery');
    expect(before).not.toBe('Out for Delivery');
    expect(page.order()?.riderName).toBe('Juan Rider');
  });

  it('shows a friendly message for an unknown order', async () => {
    orderId = 'MR-NOPE00';
    const fixture = open();
    expect(fixture.nativeElement.textContent).toContain('Order not found');
  });
});

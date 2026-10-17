import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';

import { AdminOrdersPage } from './admin-orders.page';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

describe('AdminOrdersPage', () => {
  beforeEach(async () => {
    ['cart', 'orders', 'products'].forEach((k) => localStorage.removeItem('munchrise.' + k));
    await TestBed.configureTestingModule({
      imports: [AdminOrdersPage],
      providers: [provideRouter([]), { provide: ToastController, useValue: { create: async () => ({ present: async () => {} }) } }],
    }).compileComponents();
  });

  it('filters orders by status and moves one along', async () => {
    TestBed.inject(CartService).add(TestBed.inject(ProductService).getById(3)!);
    const orders = TestBed.inject(OrderService);
    (await orders.placeOrder({
      shipping: { fullName: 'Abigail Dela Cruz', phone: '09171234567', address: 'Blk 7 Lot 12', city: 'Quezon City' },
      payment: 'Cash on Delivery',
    }));
    const fixture = TestBed.createComponent(AdminOrdersPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    expect(page.orders().length).toBe(1);
    expect(page.countFor('Placed')).toBe(1);

    await page.setStatus(orders.list()[0].id, 'Delivered');
    page.filter.set('Placed');
    expect(page.orders().length).toBe(0);
    page.filter.set('Delivered');
    expect(page.orders().length).toBe(1);
  });
});

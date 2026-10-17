import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminOverviewPage } from './admin-overview.page';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

describe('AdminOverviewPage', () => {
  beforeEach(async () => {
    ['cart', 'orders', 'products', 'reviews'].forEach((k) => localStorage.removeItem('munchrise.' + k));
    await TestBed.configureTestingModule({
      imports: [AdminOverviewPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('starts with no revenue and no best sellers', async () => {
    const fixture = TestBed.createComponent(AdminOverviewPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.revenue()).toBe(0);
    expect(fixture.componentInstance.topSellers()).toEqual([]);
  });

  it('counts revenue and best sellers from placed orders', async () => {
    const products = TestBed.inject(ProductService);
    const target = products.getById(3)!;
    TestBed.inject(CartService).add(target, 2);
    (await TestBed.inject(OrderService).placeOrder({
      shipping: { fullName: 'Abigail Dela Cruz', phone: '09171234567', address: 'Blk 7 Lot 12', city: 'Quezon City' },
      payment: 'Cash on Delivery',
    }));

    const fixture = TestBed.createComponent(AdminOverviewPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.revenue()).toBeGreaterThan(0);
    expect(fixture.componentInstance.topSellers()[0]).toEqual({ name: target.name, qty: 2 });
  });

  it('flags a product that runs out of stock', async () => {
    const fixture = TestBed.createComponent(AdminOverviewPage);
    const products = TestBed.inject(ProductService);
    products.adjustStock(1, -products.getById(1)!.stock);

    expect(fixture.componentInstance.stock().out.some((p) => p.id === 1)).toBe(true);
    expect(fixture.componentInstance.alerts()[0].id).toBe(1);
  });
});

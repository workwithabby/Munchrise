import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DashboardPage } from './dashboard.page';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { RewardsService } from '../../services/rewards.service';

describe('DashboardPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.cart');
    localStorage.removeItem('munchrise.orders');
    localStorage.removeItem('munchrise.points');
    localStorage.removeItem('munchrise.points-history');
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows points, order and cart stats', async () => {
    const rewards = TestBed.inject(RewardsService);
    rewards.addEarn(45, 'Order MR-DASH01');

    const cart = TestBed.inject(CartService);
    cart.add(TestBed.inject(ProductService).getById(3)!);

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Kumusta');
    expect(text).toContain('45');
    expect(text).toContain('No orders yet');
  });

  it('shows the latest order when one exists', async () => {
    const cart = TestBed.inject(CartService);
    cart.add(TestBed.inject(ProductService).getById(6)!);
    (await TestBed.inject(OrderService).placeOrder({
      shipping: {
        fullName: 'Abigail Dela Cruz',
        phone: '09171234567',
        address: 'Blk 7 Lot 12 Sampaguita St.',
        city: 'Quezon City',
      },
      payment: 'GCash',
    }));

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Your latest order');
    expect(text).toContain('Placed');
    expect(text).toContain('View receipt');
  });
});

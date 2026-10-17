import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { OrdersPage } from './orders.page';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

/** Blank stand-in so "go to cart" has somewhere to land. */
@Component({ template: '', standalone: true })
class BlankPage {}

describe('OrdersPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.cart');
    localStorage.removeItem('munchrise.orders');
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    }).compileComponents();
  });

  it('shows a friendly empty state', async () => {
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No orders yet');
  });

  it('lists past orders and can reorder them', async () => {
    const cart = TestBed.inject(CartService);
    const orders = TestBed.inject(OrderService);
    const products = TestBed.inject(ProductService);

    cart.add(products.getById(3)!);
    (await orders.placeOrder({
      shipping: {
        fullName: 'Abigail Dela Cruz',
        phone: '09171234567',
        address: 'Blk 7 Lot 12 Sampaguita St.',
        city: 'Quezon City',
      },
      payment: 'GCash',
    }));

    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Golden Hamwich');
    expect(fixture.nativeElement.textContent).toContain('Placed');

    await fixture.componentInstance.reorder(orders.list()[0]);
    expect(cart.count()).toBe(1);
  });
});

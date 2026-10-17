import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartPage } from './cart.page';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

describe('CartPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.cart');
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows a friendly empty state', () => {
    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');
  });

  it('lists the items with the subtotal', () => {
    const cart = TestBed.inject(CartService);
    const products = TestBed.inject(ProductService);
    cart.add(products.getById(3)!); // Golden Hamwich ₱109
    cart.add(products.getById(10)!, 2); // Rise Bowl ₱89 x2

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Golden Hamwich');
    expect(text).toContain('Rise Bowl');
    expect(text).toContain('₱287.00'); // 109 + 178
  });
});

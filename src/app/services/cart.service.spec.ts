import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartService } from './cart.service';
import { ProductService } from './product.service';
import { AuthService } from './auth.service';

describe('CartService', () => {
  let cart: CartService;
  let products: ProductService;

  beforeEach(() => {
    localStorage.removeItem('munchrise.cart');
    localStorage.removeItem('munchrise.user');
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    cart = TestBed.inject(CartService);
    products = TestBed.inject(ProductService);
  });

  it('starts empty', () => {
    expect(cart.count()).toBe(0);
    expect(cart.subtotal()).toBe(0);
    expect(cart.detailedItems().length).toBe(0);
  });

  it('adds a product and updates count and subtotal', () => {
    const hamwich = products.getById(3)!;
    cart.add(hamwich);

    expect(cart.count()).toBe(1);
    expect(cart.subtotal()).toBe(109);
    expect(cart.detailedItems()[0].product.name).toBe('Golden Hamwich');
  });

  it('increases quantity for the same product', () => {
    cart.add(products.getById(10)!); // ₱89
    cart.add(products.getById(10)!);

    expect(cart.count()).toBe(2);
    expect(cart.subtotal()).toBe(178);
  });

  it('changes quantity and removes at zero', () => {
    cart.add(products.getById(10)!);
    cart.setQuantity(10, 3);
    expect(cart.count()).toBe(3);

    cart.decrease(10);
    expect(cart.count()).toBe(2);

    cart.remove(10);
    expect(cart.count()).toBe(0);
  });

  it('respects the product stock limit', () => {
    const burrito = products.getById(15)!; // stock 29
    cart.add(burrito, 999);
    expect(cart.count()).toBe(burrito.stock);
  });

  it('clears the cart', () => {
    cart.add(products.getById(1)!);
    cart.clear();
    expect(cart.count()).toBe(0);
  });

  it('refuses to add anything for a guest', () => {
    TestBed.inject(AuthService).continueAsGuest();

    const added = cart.add(products.getById(1)!);

    expect(added).toBe(false);
    expect(cart.count()).toBe(0);
  });
});

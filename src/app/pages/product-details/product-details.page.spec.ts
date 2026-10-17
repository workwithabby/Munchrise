import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { ProductDetailsPage } from './product-details.page';
import { Order } from '../../models/order.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

/** A finished (delivered) order containing one product. */
function deliveredOrder(productId: number): Order {
  return {
    id: 'MR-TEST01',
    placedAt: '2026-10-01T08:00:00.000Z',
    items: [{ productId, name: 'Golden Hamwich', price: 109, quantity: 1 }],
    subtotal: 109,
    deliveryFee: 0,
    discount: 0,
    total: 109,
    payment: 'Cash on Delivery',
    shipping: {
      fullName: 'Abi',
      phone: '09171234567',
      address: 'Blk 7 Lot 12 Sampaguita St.',
      city: 'Quezon City',
    },
    status: 'Delivered',
    pointsEarned: 0,
  };
}

describe('ProductDetailsPage', () => {
  /** The alert the guest popup would show (no real overlay in tests). */
  let shownAlerts: { message?: string; buttons?: { text: string }[] }[];

  beforeEach(async () => {
    localStorage.removeItem('munchrise.cart');
    localStorage.removeItem('munchrise.reviews');
    localStorage.removeItem('munchrise.user');
    localStorage.removeItem('munchrise.accounts');
    localStorage.removeItem('munchrise.orders');

    shownAlerts = [];
    const fakeAlertController = {
      create: async (options: { message: string; buttons: { text: string }[] }) => {
        shownAlerts.push(options);
        return { present: async () => {} };
      },
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailsPage],
      providers: [
        provideRouter([]),
        { provide: AlertController, useValue: fakeAlertController },
      ],
    }).compileComponents();
  });

  it('shows the product details', () => {
    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Golden Hamwich');
    expect(text).toContain('₱109.00');
    expect(text).toContain('Nutrition facts');
  });

  it('shows a friendly message for an unknown id', () => {
    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '999');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not find');
  });

  it('lets a guest read reviews but hides the write form', () => {
    TestBed.inject(AuthService).continueAsGuest();
    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ratings & reviews');
    expect(text).not.toContain('Write a review');
    expect(text).not.toContain('Post review');
  });

  it('shows the sign-up popup instead of adding to cart for a guest', async () => {
    TestBed.inject(AuthService).continueAsGuest();
    const cart = TestBed.inject(CartService);
    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();

    await fixture.componentInstance.addToCart();

    expect(cart.count()).toBe(0);
    expect(shownAlerts.length).toBe(1);
    expect(shownAlerts[0].message).toBe(
      'Create an account to order. Sign up or log in to continue.',
    );
    expect(shownAlerts[0].buttons?.map((b) => b.text)).toEqual(['Sign up', 'Log in']);
  });

  it('still adds to cart for a signed-in user', async () => {
    TestBed.inject(AuthService).signUp('Abi', '', 'abi@example.com', 'secret123');
    const cart = TestBed.inject(CartService);
    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();

    await fixture.componentInstance.addToCart();

    expect(cart.count()).toBe(1);
    expect(shownAlerts.length).toBe(0);
  });

  it('shows a delivery notice instead of the form before any delivered order', () => {
    TestBed.inject(AuthService).signUp('Abi', '', 'abi@example.com', 'secret123');
    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Review after delivery');
    expect(text).not.toContain('Write a review');
    expect(text).not.toContain('Post review');
  });

  it('does not save a review before the order is delivered', () => {
    TestBed.inject(AuthService).signUp('Abi', '', 'abi@example.com', 'secret123');
    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();

    fixture.componentInstance.reviewText.set('Too early!');
    fixture.componentInstance.submitReview();

    // Golden Hamwich has no starter reviews — the new one was blocked.
    expect(fixture.componentInstance.productReviews().length).toBe(0);
  });

  it('lets the buyer post a review once the order is delivered', () => {
    TestBed.inject(AuthService).signUp('Abi', '', 'abi@example.com', 'secret123');
    localStorage.setItem('munchrise.orders', JSON.stringify([deliveredOrder(3)]));

    const fixture = TestBed.createComponent(ProductDetailsPage);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Post review');
    expect(text).not.toContain('Review after delivery');

    fixture.componentInstance.reviewText.set('Sarap ng hamwich!');
    fixture.componentInstance.submitReview();

    const reviews = fixture.componentInstance.productReviews();
    expect(reviews.length).toBe(1);
    expect(reviews[0].author).toBe('Abi');
    expect(reviews[0].comment).toBe('Sarap ng hamwich!');
  });
});

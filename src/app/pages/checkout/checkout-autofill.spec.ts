import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CheckoutPage } from './checkout.page';
import { splitName } from '../profile/profile.page';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

describe('Checkout auto-fill from the profile', () => {
  beforeEach(async () => {
    ['cart', 'orders', 'user', 'accounts'].forEach((k) => localStorage.removeItem('munchrise.' + k));
    await TestBed.configureTestingModule({ imports: [CheckoutPage], providers: [provideRouter([])] }).compileComponents();
    TestBed.inject(CartService).add(TestBed.inject(ProductService).getById(3)!);
  });

  it('fills name, number and the saved address, and lets the person change them', () => {
    const auth = TestBed.inject(AuthService);
    auth.signUp('Abigail Dela Cruz', '', 'abi@example.com', 'secret123');
    auth.updateProfile({ phone: '09171234567' });
    auth.addAddress({ label: 'Home', line: 'Blk 7 Lot 12', city: 'Quezon City' });
    auth.addAddress({ label: 'Work', line: '5th Ave Tower', city: 'Taguig' });

    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    expect(page.shipping().fullName).toBe('Abigail Dela Cruz');
    expect(page.shipping().phone).toBe('09171234567');
    expect(page.shipping().address).toBe('Blk 7 Lot 12');

    page.useAddress('5th Ave Tower', 'Taguig');
    expect(page.shipping().city).toBe('Taguig');

    page.setShipping('phone', '09998887777'); // typed by hand: not overwritten later
    auth.updateProfile({ phone: '09000000000' });
    fixture.detectChanges();
    expect(page.shipping().phone).toBe('09998887777');
  });

  it('splits a saved full name into first name and surname', () => {
    expect(splitName({ name: 'Abigail Dela Cruz' })).toEqual({ first: 'Abigail', last: 'Dela Cruz' });
    expect(splitName({ name: 'Abi', firstName: 'Abi', lastName: '' })).toEqual({ first: 'Abi', last: '' });
  });
});

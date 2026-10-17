import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { HomePage } from './home.page';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class BlankPage {}

describe('HomePage', () => {
  beforeEach(async () => {
    ['cart', 'orders', 'user', 'accounts'].forEach((k) => localStorage.removeItem('munchrise.' + k));
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([{ path: 'products', component: BlankPage }])],
    }).compileComponents();
  });

  it('is a discovery page: no full menu grid, but categories, best sellers and deals', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.product-grid')).toBeNull();
    expect(el.querySelectorAll('.cat-chip').length).toBe(7);
    expect(el.querySelectorAll('.promo').length).toBeGreaterThanOrEqual(3);
    expect(el.querySelector('.pick')).toBeTruthy();
    // best sellers (5) + top rated (6) cards only, not all 29 products
    expect(el.querySelectorAll('app-product-card').length).toBeLessThan(15);
  });

  it('opens the Menu filtered when a category tile is tapped', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    fixture.componentInstance.openCategory('Sides');
    await fixture.whenStable();

    expect(router.url).toBe('/products?category=Sides');
  });

  it('sends a search to the Menu', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    fixture.componentInstance.search('pancakes');
    await fixture.whenStable();

    expect(router.url).toBe('/products?q=pancakes');
  });

  it('shows rewards to a member and a sign-up nudge to a guest', () => {
    const guest = TestBed.createComponent(HomePage);
    guest.detectChanges();
    expect(guest.nativeElement.querySelector('.join')).toBeTruthy();
    expect(guest.nativeElement.querySelector('.rewards')).toBeNull();

    TestBed.inject(AuthService).signUp('Abigail Cruz', '', 'abi@example.com', 'secret123');
    const member = TestBed.createComponent(HomePage);
    member.detectChanges();
    expect(member.nativeElement.querySelector('.rewards')).toBeTruthy();
    expect(member.componentInstance.greeting()).toContain('Abigail');
  });
});

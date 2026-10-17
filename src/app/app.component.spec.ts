import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AppComponent } from './app.component';
import { AuthService } from './services/auth.service';

/** Blank stand-in so the router has somewhere to go after the splash. */
@Component({ template: '', standalone: true })
class BlankPage {}

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.user');
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  /**
   * All menu labels currently on screen.
   * Note: ion-label's textContent reads empty under the test DOM, so we take
   * the raw innerHTML and strip Angular's comment markers.
   */
  function menuLabels(fixture: ComponentFixture<AppComponent>): string[] {
    const nodes = fixture.nativeElement.querySelectorAll(
      '#menu-list ion-label, #menu-login ion-label',
    ) as NodeListOf<Element>;
    return Array.from(nodes).map((el) =>
      el.innerHTML.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim(),
    );
  }

  it('shows a guest only the view-only links and Login / Sign up', () => {
    TestBed.inject(AuthService).continueAsGuest();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const labels = menuLabels(fixture);
    expect(labels).toContain('About the App');
    expect(labels).toContain('Developers');
    expect(labels).toContain('Help & Support');
    expect(labels).toContain('Login / Sign up');

    expect(labels).not.toContain('Cart');
    expect(labels).not.toContain('Favorites');
    expect(labels).not.toContain('Profile');
    expect(labels).not.toContain('Admin / Vendor');
    expect(labels).not.toContain('Reports');
    expect(labels).not.toContain('Logout');
  });

  it('shows a normal user everything except Admin / Vendor', () => {
    TestBed.inject(AuthService).signUp('Abi', '', 'abi@example.com', 'secret123');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const labels = menuLabels(fixture);
    // Primary links live in the bottom tab bar; the notification bell is in the top bar.
    expect(labels.slice(0, 3)).toEqual(['Dashboard', 'Rewards', 'Favorites']);
    expect(labels).not.toContain('Notifications');
    expect(labels).toContain('Help & Support');
    expect(labels).toContain('Logout');

    expect(labels).not.toContain('Admin / Vendor');
    expect(labels).not.toContain('Reports');
    expect(labels).not.toContain('Login / Sign up');
  });

  it('shows the admin their store menu (overview, products, inventory, orders, reviews)', () => {
    TestBed.inject(AuthService).login('admin@munchrise.com', 'Admin123!');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(menuLabels(fixture)).toEqual([
      'Overview',
      'Products',
      'Promo codes',
      'Inventory',
      'Orders',
      'Reviews',
      'Settings',
      'Logout',
    ]);
  });


  it('keeps the menu off on the splash and login routes', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    await router.navigateByUrl('/');
    expect(fixture.componentInstance.menuEnabled()).toBe(false);

    await router.navigateByUrl('/login');
    expect(fixture.componentInstance.menuEnabled()).toBe(false);

    await router.navigateByUrl('/signup');
    expect(fixture.componentInstance.menuEnabled()).toBe(false);
  });

  it('allows the menu on normal pages', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    await router.navigateByUrl('/home');
    expect(fixture.componentInstance.menuEnabled()).toBe(true);
  });
});

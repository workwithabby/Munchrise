import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { SplashPage } from './splash.page';
import { AuthService } from '../../services/auth.service';

/** Blank stand-in so the router has somewhere to go after the splash. */
@Component({ template: '', standalone: true })
class BlankPage {}

/** Waits long enough for the splash timer (2.5s) plus a safety margin. */
const AFTER_SPLASH_MS = 2600;

describe('SplashPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.user');
    localStorage.removeItem('munchrise.accounts');
    await TestBed.configureTestingModule({
      imports: [SplashPage],
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    }).compileComponents();
  });

  it('shows the logo area, tagline and loading dots', () => {
    const fixture = TestBed.createComponent(SplashPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.splash-logo, .splash-fallback')).toBeTruthy();
    expect(el.querySelector('.splash-tagline')?.textContent).toContain('Rise, Munch, Repeat!');
    expect(el.querySelectorAll('.splash-dots span')).toHaveLength(3);
  });

  it('goes to the landing page after the splash when there is no session', async () => {
    const router = TestBed.inject(Router);
    TestBed.createComponent(SplashPage);

    await new Promise((resolve) => setTimeout(resolve, AFTER_SPLASH_MS));

    expect(router.url).toBe('/welcome');
  });

  it('skips the landing page after the splash when a session is saved', async () => {
    TestBed.inject(AuthService).signUp('Abi', '', 'abi@example.com', 'secret123');
    const router = TestBed.inject(Router);
    TestBed.createComponent(SplashPage);

    await new Promise((resolve) => setTimeout(resolve, AFTER_SPLASH_MS));

    expect(router.url).toBe('/home');
  });

  it('leaves much sooner when reduced motion is requested', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;

    try {
      const router = TestBed.inject(Router);
      TestBed.createComponent(SplashPage);

      await new Promise((resolve) => setTimeout(resolve, 700));

      expect(router.url).toBe('/welcome');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

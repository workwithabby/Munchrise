import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';


/** How long the splash stays (matches the CSS timing: 2.2s animation + 0.3s fade). */
const SPLASH_MS = 2500;
/** With reduced motion the animations are skipped, so move on sooner. */
const SPLASH_REDUCED_MS = 400;

/**
 * The first screen: sunrise sky, logo, tagline and a loading bar.
 * The visuals are CSS-only. The order is always /splash -> /welcome; the
 * landing page itself offers "Continue" to people who are already signed in.
 */
@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [IonIcon],
})
export class SplashPage {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  /** The tagline, one word at a time so each word can animate in. */
  readonly tagline = ['Rise,', 'Munch,', 'Repeat!'];

  /** Fallback text-mark when the logo file cannot be loaded. */
  readonly logoFailed = signal(false);

  constructor() {
    const timer = setTimeout(async () => {
      // A saved session goes straight in; only new visitors see the landing page.
      await this.auth.ready;
      let target = '/welcome';
      if (this.auth.hasSession()) {
        let last: string | null = null;
        try {
          last = localStorage.getItem('munchrise.lastUrl');
        } catch {
          /* ignore */
        }
        // Route guards still redirect if this page isn't allowed for the role.
        target = last ?? (this.auth.isAdmin() ? '/admin' : this.auth.isRider() ? '/rider' : '/home');
      }
      void this.router.navigateByUrl(target, { replaceUrl: true });
    }, prefersReducedMotion() ? SPLASH_REDUCED_MS : SPLASH_MS);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

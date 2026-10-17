import { DestroyRef, inject, Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { filter } from 'rxjs';

/** The bottom-bar pages: switching between them keeps where you were on each. */
const TAB_PATHS = ['/home', '/products', '/cart', '/orders', '/profile'];

/**
 * Remembers how far each page was scrolled and puts it back when the person
 * returns (back button, swipe/hardware back, switching tabs). A page opened
 * fresh from a link still starts at the top.
 */
@Injectable({ providedIn: 'root' })
export class ScrollMemoryService {
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);
  private readonly destroyRef = inject(DestroyRef);

  private readonly positions = new Map<string, number>();
  private restoreNext = false;

  constructor() {
    const startSub = this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe((event) => {
        // remember where the page we are leaving was scrolled to
        const from = this.key(this.router.url);
        const content = this.visibleContent();
        if (content) {
          void content.getScrollElement().then((el) => this.positions.set(from, el.scrollTop));
        }

        const direction = (this.navCtrl as unknown as { direction?: string }).direction;
        const target = this.key(event.url);
        this.restoreNext =
          event.navigationTrigger === 'popstate' ||
          direction === 'back' ||
          TAB_PATHS.some((p) => target === p);
      });

    const endSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        if (!this.restoreNext) return;
        this.restoreNext = false;
        const y = this.positions.get(this.key(event.urlAfterRedirects));
        if (y && y > 0) this.restore(y);
      });

    this.destroyRef.onDestroy(() => {
      startSub.unsubscribe();
      endSub.unsubscribe();
    });
  }

  private key(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  /** The <ion-content> of the page on screen (not the side menu, not a hidden cached page). */
  private visibleContent(): HTMLIonContentElement | undefined {
    const all = Array.from(document.querySelectorAll<HTMLIonContentElement>('#main-content ion-content'));
    return all.reverse().find((el) => !el.closest('.ion-page-hidden, .ion-page-invisible'));
  }

  /** Waits for the page to be tall enough (data may still be loading), then scrolls. */
  private restore(y: number): void {
    const started = Date.now();
    const attempt = (): void => {
      const content = this.visibleContent();
      if (content) {
        void content.getScrollElement().then((el) => {
          const room = el.scrollHeight - el.clientHeight;
          if (Math.abs(el.scrollTop - y) < 2) return; // Ionic already kept it
          if (room >= y || Date.now() - started > 1500) {
            void content.scrollToPoint(0, y, 0);
          } else {
            requestAnimationFrame(attempt);
          }
        });
        return;
      }
      if (Date.now() - started < 1500) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
  }
}

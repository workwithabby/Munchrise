import { computed, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AnimationBuilder, createAnimation } from '@ionic/core/components';
import { NavController } from '@ionic/angular';
import { filter } from 'rxjs';
import {
  IonApp,
  IonAvatar,
  IonBadge,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
} from '@ionic/angular';

import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { NotificationService } from './services/notification.service';
import { ScrollMemoryService } from './services/scroll-memory.service';
import { UserRole } from './models/user.model';

/** Where the last visited page is kept, so the app reopens there. */
export const LAST_URL_KEY = 'munchrise.lastUrl';

/** Pages that are never remembered (and hide the side menu). */
const AUTH_PATHS = ['/', '/splash', '/welcome', '/login', '/signup', '/forgot-password', '/reset-code', '/new-password', '/verify-email'];

interface MenuItem {
  label: string;
  url: string;
  icon: string;
  /** Shows a live count next to the label. */
  badge?: 'cart' | 'notifications';
  /** Who is allowed to see this link. */
  roles: UserRole[];
}

/** A group of menu links under a small heading (e.g. "Shop"). */
interface MenuSection {
  title: string;
  items: MenuItem[];
}

/**
 * Page change: the header stays put; the new page content fades in over the old one (200ms). Used by <ion-router-outlet [animation]>.
 */
export const quickTransition: AnimationBuilder = (_baseEl, opts) => {
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  /**
   * The part of a page that should animate: its <ion-content>. A page keeps
   * its <ion-header> still, so the top bar never slides. The tab layout is a
   * wrapper with no content of its own, so we take the visible tab's content;
   * if nothing is found the whole element is animated instead.
   */
  const target = (root: HTMLElement): HTMLElement => {
    const own = root.querySelector<HTMLElement>(':scope > ion-content');
    if (own) return own;

    const inner = Array.from(root.querySelectorAll<HTMLElement>('ion-content')).find((el) => {
      for (let node = el.parentElement; node && node !== root; node = node.parentElement) {
        if (node.classList.contains('ion-page-hidden')) return false;
      }
      return true;
    });
    return inner ?? root;
  };

  // Does the incoming page have its own header? Then the header stays still and only the
  // content fades; otherwise the whole incoming page fades.
  const keepHeader = !!opts.enteringEl.querySelector('ion-header');

  const entering = createAnimation()
    .addElement(opts.enteringEl)
    .beforeRemoveClass('ion-page-invisible');

  // The new page fades in OVER the old one, which stays put underneath until it is covered.
  // Fading the old page out as well (the previous version) let both go see-through at once,
  // which showed up as a flash between pages.
  entering.addAnimation(
    createAnimation()
      .addElement(keepHeader ? target(opts.enteringEl) : opts.enteringEl)
      .duration(200)
      .easing('ease-out')
      .fromTo('opacity', '0.01', '1')
      .afterClearStyles(['opacity']),
  );

  return entering.duration(200);
};

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    IonApp,
    IonAvatar,
    IonBadge,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonRouterOutlet,
    IonSplitPane,
    RouterLink,
    RouterLinkActive,
  ],
})
export class AppComponent {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);
  private readonly destroyRef = inject(DestroyRef);
  /** Restores each page's scroll position when you come back to it. */
  private readonly scrollMemory = inject(ScrollMemoryService);

  /** Set when the avatar image cannot be loaded (no photo yet). */
  protected readonly avatarFailed = signal(false);

  /** Fast page transition for the router outlet (see quickTransition). */
  protected readonly pageTransition = quickTransition;

  /**
   * True while the app is on the splash, login or sign-up page.
   * Starts true (the app always opens on the splash route) and is
   * re-checked on every navigation.
   */
  private readonly authPage = signal(true);

  /** The side menu must stay hidden (no swipe either) on those pages. */
  readonly menuEnabled = computed(() => !this.authPage());

  constructor() {
    // Code-driven navigations (router.navigateByUrl: login, logout, splash…) have
    // no direction, and Ionic then skips the page animation. Give them a forward
    // slide. Links/back buttons already set their own direction; browser
    // back/forward (popstate) keeps Ionic's own guess.
    const startSub = this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe((event) => {
        const pending = (this.navCtrl as unknown as { direction?: string }).direction;
        if (event.navigationTrigger === 'imperative' && pending === 'auto') {
          this.navCtrl.setDirection('forward', true);
        }
      });
    this.destroyRef.onDestroy(() => startSub.unsubscribe());

    const navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const path = event.urlAfterRedirects.split('?')[0];
        // Remember the last real page so a cold start can reopen it.
        if (!AUTH_PATHS.includes(path) && !path.startsWith('/checkout')) {
          try {
            localStorage.setItem(LAST_URL_KEY, event.urlAfterRedirects);
          } catch {
            /* storage unavailable: just skip */
          }
        }
        this.authPage.set(AUTH_PATHS.includes(path));
      });
    this.destroyRef.onDestroy(() => navSub.unsubscribe());

    // If the user picks a new photo, try loading it again even if an
    // earlier image failed (there is no default.png yet).
    effect(() => {
      this.avatarUrl();
      this.avatarFailed.set(false);
    });
  }

  protected readonly avatarUrl = computed(
    () => this.auth.user()?.avatar ?? 'assets/avatars/default.png',
  );

  /** First letters of the name, used as the avatar fallback: "Abigail Dela Cruz" -> "AD". */
  protected readonly initials = computed(() => {
    const name = this.auth.displayName().trim();
    if (!name) return 'G';

    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + second).toUpperCase();
  });

  /**
   * The side menu now holds only SECONDARY links — the bottom tab bar owns
   * the primary shopping loop (Home, Menu, Cart, Orders, Profile).
   * - Guest:  About, Developers
   * - User:   Dashboard, Rewards, Favorites, More… (notifications: top-bar bell)
   * Admins never use this list — they get vendorSections.
   */
  protected readonly menuSections: MenuSection[] = [
    {
      title: 'My Munchrise',
      items: [
        { label: 'Dashboard', url: '/dashboard', icon: 'grid-outline', roles: ['user'] },
        { label: 'Rewards', url: '/rewards', icon: 'star-outline', roles: ['user'] },
        { label: 'Favorites', url: '/favorites', icon: 'heart-outline', roles: ['user'] },
      ],
    },
    {
      title: 'More',
      items: [
        { label: 'About the App', url: '/about', icon: 'information-circle-outline', roles: ['guest', 'user'] },
        { label: 'Developers', url: '/developers', icon: 'people-outline', roles: ['guest', 'user'] },
        { label: 'Help & Support', url: '/help', icon: 'help-circle-outline', roles: ['guest', 'user'] },
        { label: 'Settings', url: '/settings', icon: 'settings-outline', roles: ['guest', 'user'] },
      ],
    },
  ];

  /** The admin / vendor's own menu: the store, not the shopping loop. */
  /** The rider's menu: just the delivery screen. */
  protected readonly riderSections: MenuSection[] = [
    {
      title: 'Deliver',
      items: [
        { label: 'Deliveries', url: '/rider', icon: 'bicycle-outline', roles: ['rider'] },
      ],
    },
    {
      title: 'My Earnings',
      items: [
        { label: 'Earnings', url: '/rider/earnings', icon: 'wallet-outline', roles: ['rider'] },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'My profile', url: '/rider/profile', icon: 'person-circle-outline', roles: ['rider'] },
        { label: 'Settings', url: '/settings', icon: 'settings-outline', roles: ['rider'] },
      ],
    },
  ];

  protected readonly vendorSections: MenuSection[] = [
    {
      title: 'Dashboard',
      items: [{ label: 'Overview', url: '/admin', icon: 'grid-outline', roles: ['admin'] }],
    },
    {
      title: 'Catalog',
      items: [
        { label: 'Products', url: '/admin/products', icon: 'storefront-outline', roles: ['admin'] },
        { label: 'Inventory', url: '/admin/inventory', icon: 'cube-outline', roles: ['admin'] },
        { label: 'Promo codes', url: '/admin/promos', icon: 'pricetags-outline', roles: ['admin'] },
      ],
    },
    {
      title: 'Sales & Customers',
      items: [
        { label: 'Orders', url: '/admin/orders', icon: 'receipt-outline', roles: ['admin'] },
        { label: 'Reviews', url: '/admin/reviews', icon: 'chatbubble-ellipses-outline', roles: ['admin'] },
      ],
    },
    {
      title: 'Account',
      items: [{ label: 'Settings', url: '/settings', icon: 'settings-outline', roles: ['admin'] }],
    },
  ];

  /** The sections this person may see — admins always get their own menu. */
  protected readonly visibleSections = computed<MenuSection[]>(() => {
    if (this.auth.isAdmin()) {
      return this.vendorSections;
    }
    if (this.auth.isRider()) {
      return this.riderSections;
    }

    const role: UserRole = this.auth.user()?.role ?? 'guest';

    return this.menuSections
      .map((section) => ({
        title: section.title,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  });

  /** Menu closes automatically after a tap (ion-menu-toggle). */
  protected logout(): void {
    this.auth.logout();
  }
}

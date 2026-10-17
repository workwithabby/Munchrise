import { computed, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

interface TabDef {
  id: string;
  path: string;
  label: string;
  /** Outline icon when unselected, filled icon when selected. */
  icon: string;
  iconActive: string;
  /** Optional live badge (currently only the cart count). */
  badge?: 'cart';
}

/**
 * Bottom tab bar — the primary way to move around the shopping loop.
 * The five tabs are Home, Menu, Cart, Orders and Profile; everything else
 * (product details, checkout, rewards, admin…) stays a full-screen route
 * outside these tabs.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Which tab is currently active — drives the filled icon + orange color. */
  protected readonly activeTab = signal('home');

  /**
   * The `id` doubles as Ionic's `tab` value, which it also uses as a URL
   * (`/${id}`) when a tab button is tapped. It MUST equal the route segment,
   * otherwise that second navigation lands on a non-existent path and the
   * `**` wildcard throws you back to /home. So the Menu tab's id is `products`,
   * not `menu` (only the label says "Menu").
   */
  protected readonly tabs: TabDef[] = [
    { id: 'home', path: '/home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { id: 'products', path: '/products', label: 'Menu', icon: 'restaurant-outline', iconActive: 'restaurant' },
    { id: 'cart', path: '/cart', label: 'Cart', icon: 'cart-outline', iconActive: 'cart', badge: 'cart' },
    { id: 'orders', path: '/orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
    { id: 'profile', path: '/profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  ];

  /** Live cart count shown on the Cart tab (hidden at zero). */
  protected readonly cartCount = computed(() => this.cart.count());

  constructor() {
    const navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.syncActiveTab(event.urlAfterRedirects));
    this.destroyRef.onDestroy(() => navSub.unsubscribe());

    // Pick up the tab for the URL we already landed on.
    this.syncActiveTab(this.router.url);
  }

  private syncActiveTab(url: string): void {
    const path = url.split('?')[0];
    const match = this.tabs.find((tab) => path.startsWith(tab.path));
    // Side-menu pages (favorites, help…) match no tab, so none is highlighted.
    this.activeTab.set(match ? match.id : '');
  }
}

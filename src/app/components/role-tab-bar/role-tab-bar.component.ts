import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/angular';
import { filter } from 'rxjs';

import { OrderService } from '../../services/order.service';

interface RoleTab {
  path: string;
  label: string;
  icon: string;
  iconActive: string;
  /** Live count shown on the tab (kitchen queue / orders waiting for a rider). */
  badge?: 'placed' | 'preparing';
}

const ADMIN_TABS: RoleTab[] = [
  { path: '/admin', label: 'Overview', icon: 'grid-outline', iconActive: 'grid' },
  { path: '/admin/products', label: 'Products', icon: 'storefront-outline', iconActive: 'storefront' },
  { path: '/admin/inventory', label: 'Stock', icon: 'cube-outline', iconActive: 'cube' },
  { path: '/admin/orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt', badge: 'placed' },
];

const RIDER_TABS: RoleTab[] = [
  { path: '/rider', label: 'Deliveries', icon: 'bicycle-outline', iconActive: 'bicycle', badge: 'preparing' },
  { path: '/rider/earnings', label: 'Earnings', icon: 'wallet-outline', iconActive: 'wallet' },
  { path: '/rider/profile', label: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

/**
 * Bottom tab bar for the admin and rider areas (customers use TabsPage).
 * Put it in each page's <ion-footer>: <app-role-tab-bar role="admin" />.
 */
@Component({
  selector: 'app-role-tab-bar',
  standalone: true,
  imports: [IonTabBar, IonTabButton, IonIcon, IonLabel, RouterLink],
  template: `
    <ion-tab-bar>
      @for (tab of tabs(); track tab.path) {
        <ion-tab-button
          [tab]="tab.path"
          [routerLink]="tab.path"
          routerDirection="root"
          [class.is-selected]="current() === tab.path"
          [attr.aria-current]="current() === tab.path ? 'page' : null"
          (click)="current.set(tab.path)">
          <span class="tab-icon">
            <ion-icon [name]="current() === tab.path ? tab.iconActive : tab.icon" aria-hidden="true"></ion-icon>
            @if (count(tab); as n) {
              <span class="tab-badge" aria-hidden="true">{{ n > 9 ? '9+' : n }}</span>
            }
          </span>
          <ion-label>{{ tab.label }}</ion-label>
        </ion-tab-button>
      }
    </ion-tab-bar>
  `,
})
export class RoleTabBarComponent {
  readonly role = input.required<'admin' | 'rider'>();

  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);

  protected readonly tabs = computed(() => (this.role() === 'admin' ? ADMIN_TABS : RIDER_TABS));
  protected readonly current = signal(this.pathOf(this.router.url));

  constructor() {
    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.current.set(this.pathOf(e.urlAfterRedirects)));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  protected count(tab: RoleTab): number {
    if (!tab.badge) return 0;
    const status = tab.badge === 'placed' ? 'Placed' : 'Preparing';
    return this.orders.orders().filter((o) => o.status === status).length;
  }

  private pathOf(url: string): string {
    const path = url.split(/[?#]/)[0];
    return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  }
}

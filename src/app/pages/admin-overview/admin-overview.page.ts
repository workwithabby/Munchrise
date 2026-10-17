import { computed, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar, IonFooter } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { PesoPipe } from '../../pipes/peso.pipe';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';

/** Admin landing page: sales, stock alerts and best sellers at a glance. */
@Component({
  selector: 'app-admin-overview',
  templateUrl: './admin-overview.page.html',
  styleUrls: ['./admin-overview.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent, IonFooter, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar, PesoPipe, RouterLink],
})
export class AdminOverviewPage {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly reviewService = inject(ReviewService);

  readonly revenue = computed(() => this.orderService.orders().filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0));
  readonly orderCount = computed(() => this.orderService.orderCount());
  readonly pendingCount = computed(
    () => this.orderService.orders().filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length,
  );

  readonly stock = computed(() => {
    this.productService.revision();
    const all = this.productService.getAll();
    return {
      total: all.length,
      low: all.filter((p) => p.stock > 0 && p.stock <= 5),
      out: all.filter((p) => p.stock === 0),
    };
  });

  /** Products that need restocking first (out of stock, then lowest). */
  readonly alerts = computed(() =>
    [...this.stock().out, ...this.stock().low].sort((a, b) => a.stock - b.stock).slice(0, 4),
  );

  /** Best sellers by quantity ordered. */
  readonly topSellers = computed(() => {
    const totals = new Map<number, { name: string; qty: number }>();
    for (const order of this.orderService.orders()) {
      if (order.status === 'Cancelled') continue;
      for (const line of order.items) {
        const entry = totals.get(line.productId) ?? { name: line.name, qty: 0 };
        entry.qty += line.quantity;
        totals.set(line.productId, entry);
      }
    }
    return [...totals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  });

  readonly maxQty = computed(() => Math.max(1, ...this.topSellers().map((t) => t.qty)));

  readonly recentOrders = computed(() => this.orderService.list().slice(0, 3));

  readonly reviewCount = computed(() => this.reviewService.all().length);
}

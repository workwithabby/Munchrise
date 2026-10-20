import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { DatePipe } from '@angular/common';
import { computed, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { PesoPipe } from '../../pipes/peso.pipe';
import { Order, OrderLine } from '../../models/order.model';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

import { OrderProgressComponent } from '../../components/order-progress/order-progress.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
type OrderFilter = 'all' | 'active' | 'done' | 'cancelled';

function matches(order: Order, filter: OrderFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'done':
      return order.status === 'Delivered';
    case 'cancelled':
      return order.status === 'Cancelled';
    default:
      return order.status !== 'Delivered' && order.status !== 'Cancelled';
  }
}

/** Past orders with their status, plus a one-tap Reorder. */
@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    OrderProgressComponent,
    DatePipe,
    EmptyStateComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonTitle,
    IonToolbar,
    PesoPipe,
    ProductImageComponent,
    RouterLink,
  ],
})
export class OrdersPage {
  readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  /** Newest first — stays up to date when a new order is placed. */
  readonly history = computed(() => this.orders.list());

  readonly filters: { value: OrderFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'In progress' },
    { value: 'done', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
  readonly filter = signal<OrderFilter>('all');

  /** The orders for the chosen chip. */
  readonly visible = computed(() => {
    const filter = this.filter();
    return this.history().filter((o) => matches(o, filter));
  });

  countFor(filter: OrderFilter): number {
    return this.history().filter((o) => matches(o, filter)).length;
  }

  /** Picture for one order line — looked up from the product's `image` field. */
  imageFor(line: OrderLine): string {
    return this.products.getById(line.productId)?.image ?? '';
  }

  /** Category for one order line — picks the cover art for the thumbnail. */
  categoryFor(line: OrderLine): string {
    return this.products.getById(line.productId)?.category ?? '';
  }

  itemCount(order: Order): number {
    return order.items.reduce((total, line) => total + line.quantity, 0);
  }

  async reorder(order: Order): Promise<void> {
    const result = this.orders.reorder(order.id);
    await this.toast(result.message);
    if (result.ok) {
      await this.router.navigateByUrl('/cart', { replaceUrl: false });
    }
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}

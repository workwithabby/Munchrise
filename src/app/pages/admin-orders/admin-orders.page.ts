import { DatePipe } from '@angular/common';
import { computed, Component, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonMenuButton, IonSearchbar, IonTitle, IonToolbar, ToastController } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { Order, OrderStatus, ORDER_FLOW } from '../../models/order.model';
import { OrderCancelService } from '../../services/order-cancel.service';
import { PesoPipe } from '../../pipes/peso.pipe';
import { OrderService } from '../../services/order.service';

type StatusFilter = 'All' | OrderStatus;

/** Customer orders: filter by status and move an order along. */
@Component({
  selector: 'app-admin-orders',
  templateUrl: './admin-orders.page.html',
  styleUrls: ['./admin-orders.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent, IonFooter, DatePipe, EmptyStateComponent, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonSearchbar, IonTitle, IonToolbar, PesoPipe],
})
export class AdminOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly toastController = inject(ToastController);
  private readonly cancelDialog = inject(OrderCancelService);

  readonly statuses: OrderStatus[] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
  readonly filters: StatusFilter[] = ['All', ...this.statuses];
  readonly filter = signal<StatusFilter>('All');

  readonly flow = ORDER_FLOW;
  readonly search = signal('');
  /** Orders whose details are expanded. */
  private readonly open = signal<ReadonlySet<string>>(new Set());

  readonly orders = computed(() => {
    const filter = this.filter();
    const q = this.search().trim().toLowerCase();
    return this.orderService
      .orders()
      .filter((o) => filter === 'All' || o.status === filter)
      .filter((o) => !q || o.id.toLowerCase().includes(q) || o.shipping.fullName.toLowerCase().includes(q));
  });

  isOpen(id: string): boolean {
    return this.open().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this.open());
    if (!next.delete(id)) next.add(id);
    this.open.set(next);
  }

  /** "Cheese Omelette +2 more" for the collapsed card. */
  summary(order: Order): string {
    const [first, ...rest] = order.items;
    if (!first) return 'No items';
    return rest.length === 0 ? `${first.quantity}× ${first.name}` : `${first.quantity}× ${first.name} +${rest.length} more`;
  }

  /** Orders waiting for the kitchen. */
  readonly newCount = computed(() => this.orderService.orders().filter((o) => o.status === 'Placed').length);

  stepOf(order: Order): number {
    return ORDER_FLOW.indexOf(order.status);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  toneFor(status: StatusFilter): string {
    return status === 'Placed' ? 'warning' : status === 'Delivered' ? 'success' : status === 'Cancelled' ? 'danger' : status === 'All' ? 'neutral' : 'teal';
  }

  iconFor(status: StatusFilter): string {
    return {
      All: 'layers-outline',
      Placed: 'hourglass-outline',
      Preparing: 'restaurant-outline',
      'Out for Delivery': 'bicycle-outline',
      Delivered: 'checkmark-circle-outline',
      Cancelled: 'close-circle-outline',
    }[status];
  }

  countFor(filter: StatusFilter): number {
    const all = this.orderService.orders();
    return filter === 'All' ? all.length : all.filter((o) => o.status === filter).length;
  }

  statusClass(status: OrderStatus): string {
    return status === 'Delivered' ? 'pill--success' : status === 'Placed' ? 'pill--warning' : status === 'Cancelled' ? 'pill--danger' : 'pill--teal';
  }

  /** Admins start the kitchen; riders take over from there. */
  async startPreparing(orderId: string): Promise<void> {
    await this.setStatus(orderId, 'Preparing');
  }

  canCancel(order: Order): boolean {
    return this.cancelDialog.canCancel(order, 'admin');
  }

  async cancel(order: Order): Promise<void> {
    await this.cancelDialog.ask(order, 'admin');
  }

  async setStatus(orderId: string, status: OrderStatus): Promise<void> {
    const result = await this.orderService.setStatus(orderId, status);
    const toast = await this.toastController.create({
      message: result.ok ? `${orderId} → ${status}` : (result.message ?? 'Could not change the status.'),
      duration: 1600,
      position: 'top',
      color: result.ok ? 'primary' : 'danger',
    });
    await toast.present();
  }
}

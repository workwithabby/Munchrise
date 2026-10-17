import { DatePipe } from '@angular/common';
import { computed, Component, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, ToastController, IonFooter } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { Order, OrderStatus } from '../../models/order.model';
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
  imports: [RoleTabBarComponent, IonFooter, DatePipe, EmptyStateComponent, IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, PesoPipe],
})
export class AdminOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly toastController = inject(ToastController);
  private readonly cancelDialog = inject(OrderCancelService);

  readonly statuses: OrderStatus[] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
  readonly filters: StatusFilter[] = ['All', ...this.statuses];
  readonly filter = signal<StatusFilter>('All');

  readonly orders = computed(() => {
    const filter = this.filter();
    return this.orderService.orders().filter((o) => filter === 'All' || o.status === filter);
  });

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
    return this.cancelDialog.canCancel(order, true);
  }

  async cancel(order: Order): Promise<void> {
    await this.cancelDialog.ask(order, true);
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

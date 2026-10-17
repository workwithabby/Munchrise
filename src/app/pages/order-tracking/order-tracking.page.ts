import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ORDER_FLOW, OrderStatus } from '../../models/order.model';
import { PesoPipe } from '../../pipes/peso.pipe';
import { OrderCancelService } from '../../services/order-cancel.service';
import { OrderService } from '../../services/order.service';

interface Step {
  status: OrderStatus;
  title: string;
  text: string;
  icon: string;
}

const STEPS: Step[] = [
  { status: 'Placed', title: 'Order placed', text: 'We received your order.', icon: 'receipt-outline' },
  { status: 'Preparing', title: 'Preparing', text: 'The kitchen is cooking your breakfast.', icon: 'restaurant-outline' },
  { status: 'Out for Delivery', title: 'Out for delivery', text: 'Your rider is on the way.', icon: 'bicycle-outline' },
  { status: 'Delivered', title: 'Delivered', text: 'Enjoy your breakfast!', icon: 'checkmark-circle' },
];

/** How far along the route the rider is, for each status (0 = kitchen, 1 = your door). */
const RIDER_POSITION: Record<OrderStatus, number> = {
  Placed: 0,
  Preparing: 0.08,
  'Out for Delivery': 0.62,
  Delivered: 1,
  Cancelled: 0,
};

const ETA: Record<OrderStatus, string> = {
  Placed: 'about 35 min',
  Preparing: 'about 25 min',
  'Out for Delivery': 'about 10 min',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};

const HEADLINE: Record<OrderStatus, string> = {
  Placed: 'We got your order',
  Preparing: 'The kitchen is on it',
  'Out for Delivery': 'Your rider is on the way',
  Delivered: 'Enjoy your breakfast!',
  Cancelled: 'This order was cancelled',
};

/**
 * Live order tracking: an animated route, a status timeline and the order
 * details. The status is set by the admin (Admin > Orders) and shows up here
 * instantly; there is no automatic playback.
 */
@Component({
  selector: 'app-order-tracking',
  templateUrl: './order-tracking.page.html',
  styleUrls: ['./order-tracking.page.scss'],
  standalone: true,
  imports: [
    DatePipe,
    EmptyStateComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    PesoPipe,
    RouterLink,
  ],
})
export class OrderTrackingPage {
  /** From the URL: /track/:id */
  readonly id = input<string>('');

  private readonly orders = inject(OrderService);
  private readonly cancelDialog = inject(OrderCancelService);

  readonly steps = STEPS;

  readonly order = computed(() => this.orders.orders().find((o) => o.id === this.id()));
  readonly status = computed<OrderStatus>(() => this.order()?.status ?? 'Placed');
  readonly stepIndex = computed(() => ORDER_FLOW.indexOf(this.status()));
  readonly delivered = computed(() => this.status() === 'Delivered');
  readonly cancelled = computed(() => this.status() === 'Cancelled');
  readonly canCancel = computed(() => {
    const o = this.order();
    return !!o && this.cancelDialog.canCancel(o, false);
  });

  async cancel(): Promise<void> {
    const o = this.order();
    if (o) await this.cancelDialog.ask(o, false);
  }
  readonly headline = computed(() => HEADLINE[this.status()]);
  readonly eta = computed(() => ETA[this.status()]);
  readonly riderPosition = computed(() => RIDER_POSITION[this.status()]);
  /** Height of the filled part of the timeline line, in %. */
  readonly lineFill = computed(() => (this.stepIndex() / (STEPS.length - 1)) * 100);

  /** Time this order reached a status, if we know it. */
  timeFor(status: OrderStatus): string | undefined {
    const order = this.order();
    const found = order?.history?.find((h) => h.status === status);
    if (found) return found.at;
    return status === 'Placed' ? order?.placedAt : undefined;
  }

  itemCount(): number {
    return this.order()?.items.reduce((total, line) => total + line.quantity, 0) ?? 0;
  }
}

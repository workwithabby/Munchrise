import { inject, Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

import { Order } from '../models/order.model';
import { OrderService } from './order.service';

const CUSTOMER_REASONS = [
  'I changed my mind',
  'I ordered by mistake',
  'It is taking too long',
  'I want to change my order',
];

const STORE_REASONS = ['Item out of stock', 'Store is closing', 'Cannot deliver to this address', 'Customer request'];

/** The "Cancel order" question (with a reason) shared by the customer and admin screens. */
@Injectable({ providedIn: 'root' })
export class OrderCancelService {
  private readonly orders = inject(OrderService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  /** A customer may cancel only before the kitchen starts; the admin until it leaves the kitchen. */
  canCancel(order: Order, asAdmin: boolean): boolean {
    return asAdmin ? order.status === 'Placed' || order.status === 'Preparing' : order.status === 'Placed';
  }

  /** Asks for a reason, cancels, and tells the person what happened. Resolves true when cancelled. */
  async ask(order: Order, asAdmin: boolean): Promise<boolean> {
    const reasons = asAdmin ? STORE_REASONS : CUSTOMER_REASONS;
    const alert = await this.alertController.create({
      header: `Cancel order ${order.id}?`,
      message: asAdmin
        ? 'The customer will be told why. Stock goes back on the shelf.'
        : order.payment === 'Cash on Delivery'
          ? 'This cannot be undone.'
          : 'This cannot be undone. Your payment will be refunded.',
      inputs: reasons.map((reason, index) => ({
        type: 'radio' as const,
        label: reason,
        value: reason,
        checked: index === 0,
      })),
      buttons: [
        { text: 'Keep order', role: 'cancel' },
        { text: 'Cancel order', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values?: string }>();
    if (role !== 'confirm') return false;

    const reason = typeof data?.values === 'string' ? data.values : reasons[0];
    const result = await this.orders.cancelOrder(order.id, reason);
    const toast = await this.toastController.create({
      message: result.ok ? `Order ${order.id} cancelled.` : (result.message ?? 'Could not cancel the order.'),
      duration: 2000,
      position: 'top',
      color: result.ok ? 'primary' : 'danger',
    });
    await toast.present();
    return result.ok;
  }
}

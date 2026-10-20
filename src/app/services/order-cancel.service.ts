import { inject, Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

import { Order } from '../models/order.model';
import { OrderService } from './order.service';

export type CancelRole = 'admin' | 'rider';

const REASONS: Record<CancelRole, string[]> = {
  admin: ['Item out of stock', 'Store is closing', 'Cannot deliver to this address', 'Customer request'],
  rider: ['Customer unreachable', 'Wrong or incomplete address', 'Customer refused the order', 'Cannot reach the address'],
};

/** The "Cancel order" question (with a reason) shared by the admin and rider screens. */
@Injectable({ providedIn: 'root' })
export class OrderCancelService {
  private readonly orders = inject(OrderService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  /** Customers cannot cancel. Admin: until it leaves the kitchen. Rider: while delivering it. */
  canCancel(order: Order, role: CancelRole): boolean {
    return role === 'admin'
      ? order.status === 'Placed' || order.status === 'Preparing'
      : order.status === 'Out for Delivery';
  }

  /** Asks for a reason, cancels, and tells the person what happened. Resolves true when cancelled. */
  async ask(order: Order, role: CancelRole): Promise<boolean> {
    const reasons = REASONS[role];
    const alert = await this.alertController.create({
      header: `Cancel order ${order.id}?`,
      message: 'The customer will be told why.',
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
    const { role: dismissRole, data } = await alert.onDidDismiss<{ values?: string }>();
    if (dismissRole !== 'confirm') return false;

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

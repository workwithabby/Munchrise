import { DatePipe } from '@angular/common';
import { computed, Component, inject, signal } from '@angular/core';
import { AlertController, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToggle, IonToolbar, ToastController, IonFooter } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { Order } from '../../models/order.model';
import { PesoPipe } from '../../pipes/peso.pipe';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { RiderService } from '../../services/rider.service';

type RiderTab = 'pickup' | 'ontheway' | 'done';

/**
 * Rider home. The kitchen marks an order "Preparing"; an ONLINE rider takes it
 * ("Out for Delivery") and confirms the drop-off ("Delivered"). A rider only
 * sees the on-the-way and finished orders that they took themselves.
 */
@Component({
  selector: 'app-rider',
  templateUrl: './rider.page.html',
  styleUrls: ['./rider.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent, IonFooter, DatePipe, EmptyStateComponent, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToggle, IonToolbar, PesoPipe],
})
export class RiderPage {
  private readonly orderService = inject(OrderService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  protected readonly auth = inject(AuthService);
  protected readonly rider = inject(RiderService);

  readonly tabs: { id: RiderTab; label: string; icon: string }[] = [
    { id: 'pickup', label: 'To pick up', icon: 'bag-check-outline' },
    { id: 'ontheway', label: 'On the way', icon: 'bicycle-outline' },
    { id: 'done', label: 'Delivered', icon: 'checkmark-circle-outline' },
  ];

  /** Orders whose item list is open. */
  private readonly open = signal<ReadonlySet<string>>(new Set());

  isOpen(id: string): boolean {
    return this.open().has(id);
  }

  toggle(id: string): void {
    const next = new Set(this.open());
    if (!next.delete(id)) next.add(id);
    this.open.set(next);
  }

  itemCount(order: Order): number {
    return order.items.reduce((sum, line) => sum + line.quantity, 0);
  }
  readonly tab = signal<RiderTab>('pickup');

  /** "Good morning" / "Good afternoon" / "Good evening" for the banner. */
  readonly greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  /** First name only, so the banner stays short. */
  readonly firstName = computed(() => this.auth.displayName().trim().split(/\s+/)[0] || 'Rider');

  readonly toPickUp = computed(() => this.orderService.orders().filter((o) => o.status === 'Preparing'));

  readonly orders = computed<Order[]>(() => {
    switch (this.tab()) {
      case 'pickup':
        return this.toPickUp();
      case 'ontheway':
        return this.rider.onTheWay();
      default:
        return this.rider.completed();
    }
  });

  countFor(id: RiderTab): number {
    if (id === 'pickup') return this.toPickUp().length;
    return id === 'ontheway' ? this.rider.onTheWay().length : this.rider.completed().length;
  }

  mapsUrl(order: Order): string {
    const q = encodeURIComponent(`${order.shipping.address}, ${order.shipping.city}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  async pickUp(order: Order): Promise<void> {
    if (!this.rider.online()) {
      await this.toast('You are offline. Go online to take orders.');
      return;
    }
    const result = await this.orderService.setStatus(order.id, 'Out for Delivery', this.auth.displayName());
    if (!result.ok) {
      await this.toast(result.message ?? 'Could not take this order.');
      return;
    }
    this.tab.set('ontheway');
    await this.toast(`${order.id} picked up. Ride safe!`);
  }

  /** Asks for a confirmation first; Cash on Delivery orders ask for the cash. */
  async deliver(order: Order): Promise<void> {
    const cash = order.payment === 'Cash on Delivery';
    const alert = await this.alertController.create({
      header: cash ? 'Cash collected?' : 'Confirm delivery',
      message: cash
        ? `Collect ₱${order.total.toFixed(2)} from ${order.shipping.fullName}, then confirm.`
        : `Hand the order to ${order.shipping.fullName}, then confirm.`,
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        {
          text: cash ? 'Collected & delivered' : 'Delivered',
          handler: async () => {
            const result = await this.orderService.setStatus(order.id, 'Delivered');
            await this.toast(result.ok ? `${order.id} delivered. Great job!` : (result.message ?? 'Could not mark it delivered.'));
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1600, position: 'top', color: 'primary' });
    await toast.present();
  }
}

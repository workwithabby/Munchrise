import { Component, computed, inject, signal } from '@angular/core';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonMenuButton,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';
import { PromoCode } from '../../data/promos';
import { describePromo, PromoService } from '../../services/promo.service';

/**
 * Admin: create promo codes for customers. A new code appears on customers' Home screen
 * and works at checkout straight away; it can be switched off or deleted at any time.
 */
@Component({
  selector: 'app-admin-promos',
  templateUrl: './admin-promos.page.html',
  styleUrls: ['./admin-promos.page.scss'],
  standalone: true,
  imports: [
    EmptyStateComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonMenuButton,
    IonTitle,
    IonToggle,
    IonToolbar,
    RoleTabBarComponent,
  ],
})
export class AdminPromosPage {
  private readonly promoService = inject(PromoService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly promos = computed(() => this.promoService.all());
  readonly filter = signal<'all' | 'live' | 'off'>('all');
  readonly formOpen = signal(true);

  readonly shown = computed(() => {
    const f = this.filter();
    return this.promos().filter((p) => f === 'all' || (f === 'live' ? p.active !== false : p.active === false));
  });

  readonly quickValues = computed(() => (this.type() === 'percent' ? [5, 10, 15, 20, 25] : [20, 50, 100, 150]));

  setType(type: 'percent' | 'fixed'): void {
    this.type.set(type);
    this.value.set('');
  }

  async copy(promo: PromoCode): Promise<void> {
    try {
      await navigator.clipboard.writeText(promo.code);
      await this.toast(`${promo.code} copied.`);
    } catch {
      await this.toast(`Code: ${promo.code}`);
    }
  }

  readonly activeCount = computed(() => this.promos().filter((p) => p.active !== false).length);

  // the "create" form
  readonly code = signal('');
  readonly type = signal<'percent' | 'fixed'>('percent');
  readonly value = signal('');
  readonly minSubtotal = signal('');
  readonly description = signal('');
  readonly error = signal('');
  readonly saving = signal(false);

  /** A preview of how customers will see the code. */
  readonly preview = computed(() => {
    const value = Number(this.value());
    if (!value) return '';
    return this.description().trim() || describePromo({ type: this.type(), value, minSubtotal: Number(this.minSubtotal()) || undefined });
  });

  async create(): Promise<void> {
    this.error.set('');
    this.saving.set(true);
    try {
      const message = await this.promoService.create({
        code: this.code(),
        type: this.type(),
        value: Number(this.value()),
        minSubtotal: this.minSubtotal().trim() === '' ? undefined : Number(this.minSubtotal()),
        description: this.description(),
      });
      if (message) {
        this.error.set(message);
        return;
      }
      const created = this.code().trim().toUpperCase();
      this.code.set('');
      this.value.set('');
      this.minSubtotal.set('');
      this.description.set('');
      await this.toast(`${created} created. Customers can use it now.`);
    } finally {
      this.saving.set(false);
    }
  }

  async setActive(promo: PromoCode, active: boolean): Promise<void> {
    await this.promoService.setActive(promo.code, active);
    await this.toast(active ? `${promo.code} is on.` : `${promo.code} is switched off.`);
  }

  async askDelete(promo: PromoCode): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete promo code?',
      message: `${promo.code} will stop working for everyone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.promoService.remove(promo.code);
            await this.toast(`${promo.code} deleted.`);
          },
        },
      ],
    });
    await alert.present();
  }

  details(promo: PromoCode): string {
    const what = promo.type === 'percent' ? `${promo.value}% off` : `₱${promo.value} off`;
    return promo.minSubtotal ? `${what} · min. order ₱${promo.minSubtotal}` : what;
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1800, position: 'top', color: 'primary' });
    await toast.present();
  }
}

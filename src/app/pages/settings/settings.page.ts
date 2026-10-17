import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

interface SettingsLink {
  label: string;
  url: string;
  icon: string;
}

/** Settings for every role: account, password and shortcuts that fit the role. */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class SettingsPage {
  protected readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);

  readonly current = signal('');
  readonly next = signal('');
  readonly confirm = signal('');
  readonly error = signal('');
  readonly saving = signal(false);

  readonly roleLabel = computed(() => {
    const role = this.auth.user()?.role ?? 'guest';
    return { guest: 'Guest', user: 'Customer', admin: 'Vendor / Admin', rider: 'Rider' }[role];
  });

  readonly backHref = computed(() => this.auth.homePath());

  /** Shortcuts that belong to this role. */
  readonly links = computed<SettingsLink[]>(() => {
    switch (this.auth.user()?.role) {
      case 'admin':
        return [
          { label: 'Manage products', url: '/admin/products', icon: 'storefront-outline' },
          { label: 'Promo codes', url: '/admin/promos', icon: 'pricetags-outline' },
          { label: 'Inventory', url: '/admin/inventory', icon: 'cube-outline' },
        ];
      case 'rider':
        return [
          { label: 'Rider profile & vehicle', url: '/rider/profile', icon: 'person-circle-outline' },
          { label: 'Earnings', url: '/rider/earnings', icon: 'wallet-outline' },
        ];
      case 'user':
        return [
          { label: 'Profile, addresses & payments', url: '/profile', icon: 'person-circle-outline' },
          { label: 'Rewards', url: '/rewards', icon: 'star-outline' },
          { label: 'Favorites', url: '/favorites', icon: 'heart-outline' },
        ];
      default:
        return [];
    }
  });

  async changePassword(): Promise<void> {
    if (this.next() !== this.confirm()) {
      this.error.set('The new passwords do not match.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    const result = await this.auth.changePassword(this.current(), this.next());
    this.saving.set(false);

    if (!result.ok) {
      this.error.set(result.message);
      return;
    }
    this.current.set('');
    this.next.set('');
    this.confirm.set('');
    const toast = await this.toastController.create({
      message: result.message,
      duration: 1800,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }

  logout(): void {
    void this.auth.logout();
  }
}

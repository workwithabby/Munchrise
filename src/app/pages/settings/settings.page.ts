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

/** Largest photo we keep (stored as a data URL). */
const MAX_PHOTO_BYTES = 1_500_000;

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

  /** Name being edited; starts from the saved name. */
  readonly name = signal(this.auth.user()?.name ?? '');
  readonly photoFailed = signal(false);

  readonly avatarUrl = computed(() => this.auth.user()?.avatar ?? 'assets/avatars/default.png');
  readonly initials = computed(() => {
    const parts = this.auth.displayName().trim().split(/\s+/);
    return ((parts[0]?.[0] ?? 'G') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });

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

  saveName(): void {
    const full = this.name().trim().replace(/\s+/g, ' ');
    if (!full) {
      void this.toast('Please enter your name.', 'danger');
      return;
    }
    const [firstName, ...rest] = full.split(' ');
    this.auth.updateProfile({ name: full, firstName, lastName: rest.join(' ') });
    this.name.set(full);
    void this.toast('Name updated.');
  }

  pickPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      void this.toast('Please choose an image file.', 'danger');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      void this.toast('Please pick a smaller photo (under 1.5 MB).', 'danger');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.auth.updateProfile({ avatar: String(reader.result) });
      this.photoFailed.set(false);
      void this.toast('Profile photo updated!');
    };
    reader.readAsDataURL(file);
  }

  private async toast(message: string, color: 'primary' | 'danger' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1800, position: 'top', color });
    await toast.present();
  }

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

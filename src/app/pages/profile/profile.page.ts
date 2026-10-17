import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { Component, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonMenuButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
/** First name + surname of a user (older accounts only stored one full name). */
export function splitName(user: { name: string; firstName?: string; lastName?: string } | null): { first: string; last: string } {
  if (!user) return { first: '', last: '' };
  if (user.firstName !== undefined) return { first: user.firstName, last: user.lastName ?? '' };
  const [first = '', ...rest] = user.name.trim().split(/\s+/);
  return { first, last: rest.join(' ') };
}

/** Largest photo we keep in localStorage (data URL). */
const MAX_PHOTO_BYTES = 1_500_000;

/** Profile: photo, contact info, saved addresses and payment methods. */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    EmptyStateComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonMenuButton,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class ProfilePage {
  readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);

  readonly avatarFailed = signal(false);

  /** Convenience views of the logged-in user (empty lists when logged out). */
  readonly addresses = linkedSignal(() => this.auth.user()?.addresses ?? []);
  readonly payments = linkedSignal(() => this.auth.user()?.payments ?? []);

  /** Editable fields — they follow the logged-in user automatically. */
  readonly firstName = linkedSignal(() => splitName(this.auth.user()).first);
  readonly lastName = linkedSignal(() => splitName(this.auth.user()).last);
  readonly phone = linkedSignal(() => this.auth.user()?.phone ?? '');

  /** Add-forms stay hidden until "+ Add" is tapped (less clutter). */
  readonly showAddressForm = signal(false);
  readonly showPaymentForm = signal(false);

  /** New address form. */
  readonly newAddressLabel = signal('Home');
  readonly newAddressLine = signal('');
  readonly newAddressCity = signal('');

  /** New payment method form (fake details only). */
  readonly newPaymentType = signal<'GCash' | 'Card'>('GCash');
  readonly newPaymentLabel = signal('');
  readonly newPaymentLast4 = signal('');

  /** Photo picker — <input type="file"> is wrapped in a hidden button. */
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
      this.avatarFailed.set(false);
      void this.toast('Profile photo updated!');
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    const firstName = this.firstName().trim();
    const lastName = this.lastName().trim();
    if (!firstName) {
      void this.toast('Please enter your first name.', 'danger');
      return;
    }

    this.auth.updateProfile({
      firstName,
      lastName,
      name: [firstName, lastName].filter(Boolean).join(' '),
      phone: this.phone().trim(),
    });
    void this.toast('Profile saved.');
  }

  addAddress(): void {
    const line = this.newAddressLine().trim();
    const city = this.newAddressCity().trim();

    if (line.length < 5 || city.length < 2) {
      void this.toast('Please complete the address fields.', 'danger');
      return;
    }

    this.auth.addAddress({
      label: this.newAddressLabel().trim() || 'Address',
      line,
      city,
    });
    this.newAddressLine.set('');
    this.newAddressCity.set('');
    this.showAddressForm.set(false);
    void this.toast('Address saved.');
  }

  addPayment(): void {
    const label = this.newPaymentLabel().trim();
    const last4 = this.newPaymentLast4().trim();

    if (!label) {
      void this.toast('Please give this payment method a name.', 'danger');
      return;
    }
    if (this.newPaymentType() === 'Card' && !/^\d{4}$/.test(last4)) {
      void this.toast('Enter the last 4 digits of the card.', 'danger');
      return;
    }

    this.auth.addPayment({
      label,
      type: this.newPaymentType(),
      masked: this.newPaymentType() === 'Card' ? `•••• ${last4}` : 'Mobile wallet',
    });
    this.newPaymentLabel.set('');
    this.newPaymentLast4.set('');
    this.showPaymentForm.set(false);
    void this.toast('Payment method saved.');
  }

  async logout(): Promise<void> {
    // The service clears the session and goes to /login by itself.
    this.auth.logout();
    await this.toast('Logged out. See you tomorrow!');
  }

  avatarUrl(): string {
    return this.auth.user()?.avatar ?? 'assets/avatars/default.png';
  }

  initials(): string {
    const parts = this.auth.displayName().trim().split(/\s+/);
    const first = parts[0]?.[0] ?? 'G';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + second).toUpperCase();
  }

  private async toast(message: string, color: 'primary' | 'danger' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'top',
      color,
    });
    await toast.present();
  }
}

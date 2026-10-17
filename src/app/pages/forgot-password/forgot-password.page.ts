import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { AuthResult, AuthService } from '../../services/auth.service';

/** Loose but useful email check: something@something.tld */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Forgot password, step 1 of 3: type your email and we send a 6-digit code (then /reset-code, then /new-password). */
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonSpinner,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly email = signal('');
  readonly formError = signal('');
  readonly busy = signal(false);

  /** Step 1: send the code, then open the code screen. */
  async sendCode(): Promise<void> {
    if (this.busy()) return;
    this.formError.set('');

    const email = this.email().trim();
    if (!EMAIL_PATTERN.test(email)) {
      await this.showError('Please enter a valid email.');
      return;
    }

    this.busy.set(true);
    let result: AuthResult;
    try {
      result = await this.auth.requestPasswordReset(email);
    } catch {
      result = { ok: false, message: 'Something went wrong. Please try again.' };
    } finally {
      this.busy.set(false);
    }

    if (!result.ok) {
      await this.showError(result.message);
      return;
    }

    await this.toast(result.message);
    await this.router.navigate(['/reset-code'], { queryParams: { email } });
  }

  private async showError(message: string): Promise<void> {
    this.formError.set(message);
    await this.toast(message, 'danger');
  }

  private async toast(message: string, color: 'primary' | 'danger' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2200, position: 'top', color });
    await toast.present();
  }
}

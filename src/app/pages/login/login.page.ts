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
  IonInputPasswordToggle,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { AuthResult, AuthService } from '../../services/auth.service';

/** Loose but useful email check: something@something.tld */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Log in with email and password (Supabase Auth). */
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
    IonSpinner,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly email = signal('');
  readonly password = signal('');
  readonly formError = signal('');
  /** True while the server call runs: shows a spinner and blocks double taps. */
  readonly busy = signal(false);

  async login(): Promise<void> {
    if (this.busy()) return;
    this.formError.set('');

    const email = this.email().trim();
    if (!EMAIL_PATTERN.test(email)) {
      await this.showError('Please enter a valid email.');
      return;
    }

    if (!this.password()) {
      await this.showError('Please enter your password.');
      return;
    }

    this.busy.set(true);
    let result: AuthResult;
    try {
      result = await this.auth.login(email, this.password());
    } catch {
      result = { ok: false, message: 'Something went wrong. Please try again.' };
    } finally {
      this.busy.set(false);
    }
    if (result.needsVerification) {
      await this.router.navigate(['/verify-email'], { queryParams: { email } });
      return;
    }
    if (!result.ok) {
      await this.showError(result.message);
      return;
    }

    await this.toast(result.message);
    // Admins land on product management, riders on deliveries; everyone else goes shopping.
    await this.router.navigateByUrl(this.auth.homePath(), {
      replaceUrl: true,
    });
  }

  async continueAsGuest(): Promise<void> {
    this.auth.continueAsGuest();
    await this.toast('Browsing as guest. Enjoy your breakfast!');
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  private async showError(message: string): Promise<void> {
    this.formError.set(message);
    await this.toast(message, 'danger');
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
